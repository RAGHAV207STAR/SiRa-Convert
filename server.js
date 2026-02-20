import express from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const unlockRateWindowMs = 15 * 60 * 1000;
const unlockRateMax = 30;
const maxIncorrectAttempts = 10;
const unlockIpState = new Map();
const unlockAttemptState = new Map();
const unlockJobs = new Map();

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function cleanExpiredState() {
  const now = Date.now();
  for (const [key, value] of unlockIpState.entries()) {
    if (now - value.windowStart > unlockRateWindowMs) unlockIpState.delete(key);
  }
  for (const [key, value] of unlockAttemptState.entries()) {
    if (now - value.firstAt > unlockRateWindowMs) unlockAttemptState.delete(key);
  }
  for (const [key, value] of unlockJobs.entries()) {
    if (value.status === "running") continue;
    if (now - value.updatedAt > unlockRateWindowMs) {
      unlockJobs.delete(key);
      cleanupJobFiles(value).catch(() => {});
    }
  }
}

async function cleanupJobFiles(job) {
  if (!job || !job.workDir) return;
  await fs.rm(job.workDir, { recursive: true, force: true });
}

function enforceUnlockOrigin(req, res, next) {
  const origin = String(req.headers.origin || "");
  const host = String(req.headers.host || "");
  if (!origin) {
    next();
    return;
  }
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host) {
      res.status(403).json({ error: "Origin not allowed." });
      return;
    }
    next();
  } catch (_error) {
    res.status(403).json({ error: "Invalid request origin." });
  }
}

function enforceUnlockRateLimit(req, res, next) {
  cleanExpiredState();
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = unlockIpState.get(ip);
  if (!entry || now - entry.windowStart > unlockRateWindowMs) {
    unlockIpState.set(ip, { windowStart: now, count: 1 });
    next();
    return;
  }
  if (entry.count >= unlockRateMax) {
    res.status(429).json({ error: "Too many unlock requests. Try again later." });
    return;
  }
  entry.count += 1;
  next();
}

function registerPasswordFailure(ip) {
  const now = Date.now();
  const attemptEntry = unlockAttemptState.get(ip);
  if (!attemptEntry || now - attemptEntry.firstAt > unlockRateWindowMs) {
    unlockAttemptState.set(ip, { firstAt: now, count: 1 });
    return;
  }
  attemptEntry.count += 1;
}

function clearPasswordFailure(ip) {
  unlockAttemptState.delete(ip);
}

function hasExceededPasswordFailures(ip) {
  const now = Date.now();
  const attemptEntry = unlockAttemptState.get(ip);
  return Boolean(attemptEntry && attemptEntry.count >= maxIncorrectAttempts && now - attemptEntry.firstAt <= unlockRateWindowMs);
}

async function createUnlockJob(file, password, ip) {
  const id = randomUUID();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "sira-pdf-"));
  const inputPath = path.join(workDir, "input.pdf");
  const outputPath = path.join(workDir, "output.pdf");
  await fs.writeFile(inputPath, file.buffer);

  const job = {
    id,
    ip,
    workDir,
    inputPath,
    outputPath,
    originalName: file.originalname || "document.pdf",
    status: "running",
    errorCode: "",
    errorMessage: "",
    updatedAt: Date.now(),
    child: null
  };

  const args = [`--password=${password}`, "--decrypt", inputPath, outputPath];
  const child = spawn("qpdf", args);
  job.child = child;
  unlockJobs.set(id, job);

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk || "");
  });
  child.on("error", (error) => {
    job.status = "error";
    job.errorCode = "spawn_error";
    job.errorMessage = String(error && error.message ? error.message : "Failed to start unlock process.");
    job.updatedAt = Date.now();
  });
  child.on("close", (code, signal) => {
    if (job.status !== "running") return;
    if (code === 0) {
      job.status = "done";
      job.updatedAt = Date.now();
      clearPasswordFailure(ip);
      return;
    }

    const message = String(stderr || "").toLowerCase();
    if (message.includes("invalid password") || message.includes("incorrect password")) {
      job.status = "error";
      job.errorCode = "incorrect_password";
      job.errorMessage = "Incorrect PDF password.";
      registerPasswordFailure(ip);
    } else if (signal === "SIGTERM") {
      job.status = "canceled";
      job.errorCode = "canceled";
      job.errorMessage = "Unlock canceled.";
    } else if (message.includes("qpdf") && message.includes("not found")) {
      job.status = "error";
      job.errorCode = "qpdf_missing";
      job.errorMessage = "qpdf is not installed on the server.";
    } else {
      job.status = "error";
      job.errorCode = "unlock_failed";
      job.errorMessage = "Failed to unlock PDF.";
    }
    job.updatedAt = Date.now();
  });

  return job;
}

async function sendJobResult(res, job) {
  try {
    const bytes = await fs.readFile(job.outputPath);
    if (!bytes.length) {
      res.status(500).json({ error: "Failed to unlock PDF." });
      return;
    }
    const outName = job.originalName.replace(/\.pdf$/i, "") + "-unlocked.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
    res.send(bytes);
  } finally {
    unlockJobs.delete(job.id);
    await cleanupJobFiles(job).catch(() => {});
  }
}

export function createApp() {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
  });

  app.disable("x-powered-by");
  app.use(express.static(process.cwd(), { extensions: ["html"] }));
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/unlock-pdf/start", enforceUnlockOrigin, enforceUnlockRateLimit, upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "PDF file is required." });
      return;
    }
    if (req.file.mimetype !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files are allowed." });
      return;
    }

    const ip = getClientIp(req);
    if (hasExceededPasswordFailures(ip)) {
      res.status(429).json({ error: "Too many incorrect password attempts. Try again later." });
      return;
    }

    const password = String(req.body && req.body.password ? req.body.password : "");
    try {
      const job = await createUnlockJob(req.file, password, ip);
      res.status(202).json({ jobId: job.id, status: job.status });
    } catch (_error) {
      res.status(500).json({ error: "Failed to initialize unlock job." });
    }
  });

  app.get("/api/unlock-pdf/result/:jobId", enforceUnlockOrigin, async (req, res) => {
    cleanExpiredState();
    const job = unlockJobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Unlock job not found." });
      return;
    }

    if (job.status === "running") {
      res.status(202).json({ status: "running" });
      return;
    }
    if (job.status === "done") {
      await sendJobResult(res, job);
      return;
    }
    if (job.status === "canceled") {
      unlockJobs.delete(job.id);
      await cleanupJobFiles(job).catch(() => {});
      res.status(410).json({ error: "Unlock canceled." });
      return;
    }

    const code = job.errorCode;
    const message = job.errorMessage || "Failed to unlock PDF.";
    unlockJobs.delete(job.id);
    await cleanupJobFiles(job).catch(() => {});
    if (code === "incorrect_password") {
      res.status(401).json({ error: message });
      return;
    }
    if (code === "qpdf_missing") {
      res.status(500).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  });

  app.post("/api/unlock-pdf/cancel/:jobId", enforceUnlockOrigin, (req, res) => {
    const job = unlockJobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Unlock job not found." });
      return;
    }
    if (job.status !== "running") {
      res.status(200).json({ status: job.status });
      return;
    }
    job.status = "canceled";
    job.errorCode = "canceled";
    job.errorMessage = "Unlock canceled.";
    job.updatedAt = Date.now();
    if (job.child) {
      try {
        job.child.kill("SIGTERM");
      } catch (_error) {
        // Ignore if process is already closed.
      }
    }
    res.status(200).json({ status: "canceled" });
  });

  return app;
}

const app = createApp();
const port = Number(process.env.PORT || 8080);
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  app.listen(port, () => {
    console.log(`SiRa backend listening on http://localhost:${port}`);
  });
}
