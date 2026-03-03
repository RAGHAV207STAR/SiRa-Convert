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
const MAX_UNLOCK_UPLOAD_BYTES = 200 * 1024 * 1024;
const allowAnyOrigin = String(process.env.UNLOCK_ALLOW_ANY_ORIGIN || "").toLowerCase() === "true";
const trustProxySetting = parseTrustProxySetting(process.env.UNLOCK_TRUST_PROXY);
const allowedOriginSet = new Set(
  String(process.env.UNLOCK_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)
);
const unlockIpState = new Map();
const unlockAttemptState = new Map();
const unlockJobs = new Map();

function getClientIp(req) {
  const raw = String(req.ip || req.socket.remoteAddress || "").trim();
  if (!raw) return "unknown";
  return raw.replace(/^::ffff:/, "");
}

function parseTrustProxySetting(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

function toSafeDownloadName(name, fallback) {
  const selected = String(name || fallback || "download.pdf");
  const withoutControls = selected.replace(/[\u0000-\u001f\u007f]/g, "");
  const replacedUnsafe = withoutControls.replace(/[\\/"\r\n]+/g, "-").trim();
  return replacedUnsafe || String(fallback || "download.pdf");
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

function hasPdfHeader(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

function isAllowedPdfUpload(file) {
  if (!file) return false;
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "");
  const looksLikePdfName = /\.pdf$/i.test(name);
  const hasPdfMime = mime === "application/pdf";
  const genericMime = mime === "application/octet-stream" || mime === "";
  const headerOk = hasPdfHeader(file.buffer);
  if (hasPdfMime && headerOk) return true;
  if (genericMime && looksLikePdfName && headerOk) return true;
  return false;
}

function summarizeQpdfError(stderr) {
  const raw = String(stderr || "").replace(/\s+/g, " ").trim();
  if (!raw) return "Failed to unlock PDF.";
  if (/unsupported encryption|not encrypted/i.test(raw)) {
    return "PDF encryption format is unsupported for this unlock method.";
  }
  if (/invalid password|incorrect password/i.test(raw)) {
    return "Incorrect PDF password.";
  }
  if (/operation not permitted|permission|owner password/i.test(raw)) {
    return "This PDF requires a different permission/owner password.";
  }
  if (/damaged|corrupt|not a pdf|unable to find|xref|trailer/i.test(raw)) {
    return "PDF appears damaged or invalid.";
  }
  const cleaned = raw.slice(0, 220);
  return `Unlock failed: ${cleaned}`;
}

function summarizeQpdfFailure(output, code, signal) {
  const parsed = summarizeQpdfError(output);
  if (parsed !== "Failed to unlock PDF.") return parsed;
  if (signal) return `Unlock failed (qpdf terminated by ${signal}).`;
  if (typeof code === "number") return `Unlock failed (qpdf exit code ${code}).`;
  return "Failed to unlock PDF.";
}

function normalizeOrigin(value) {
  try {
    return new URL(String(value || "").trim()).origin.toLowerCase();
  } catch (_error) {
    return "";
  }
}

function isLocalDevOrigin(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = String(parsed.hostname || "").toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return false;
    if (!parsed.port) return true;
    return ["5500", "8080"].includes(parsed.port);
  } catch (_error) {
    return false;
  }
}

function resolveRequestOrigin(req) {
  const rawOrigin = String(req.headers.origin || "").trim();
  const normalizedOrigin = normalizeOrigin(rawOrigin);
  if (normalizedOrigin) return normalizedOrigin;

  const protoRaw = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || req.protocol || "http";
  const proto = protoRaw.toLowerCase() === "https" ? "https" : "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  return `${proto}://${host}`.toLowerCase();
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowAnyOrigin) return true;
  if (isLocalDevOrigin(origin)) return true;
  return allowedOriginSet.has(origin);
}

function applyCors(req, res) {
  const origin = normalizeOrigin(req.headers.origin);
  if (!origin || !isOriginAllowed(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

async function cleanupJobFiles(job) {
  if (!job || !job.workDir) return;
  await fs.rm(job.workDir, { recursive: true, force: true });
}

function enforceUnlockOrigin(req, res, next) {
  const requestOrigin = resolveRequestOrigin(req);
  let originHost = "";
  try {
    originHost = requestOrigin ? new URL(requestOrigin).host.toLowerCase() : "";
  } catch (_error) {
    originHost = "";
  }
  const hostHeader = String(req.headers.host || "").split(",")[0].trim().toLowerCase();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
  const sameHost = Boolean(
    originHost &&
      ((hostHeader && originHost === hostHeader) ||
        (forwardedHost && originHost === forwardedHost))
  );

  applyCors(req, res);
  if (sameHost || isOriginAllowed(requestOrigin)) {
    next();
    return;
  }
  res.status(403).json({ error: "Origin not allowed. Add frontend origin to UNLOCK_ALLOWED_ORIGINS." });
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
  let stdout = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk || "");
  });
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk || "");
  });
  child.on("error", (error) => {
    job.status = "error";
    const code = String((error && error.code) || "");
    const message = String(error && error.message ? error.message : "Failed to start unlock process.");
    if (code === "ENOENT" || /spawn\s+qpdf\s+enoent/i.test(message)) {
      job.errorCode = "qpdf_missing";
      job.errorMessage = "qpdf is not installed on the server.";
    } else {
      job.errorCode = "spawn_error";
      job.errorMessage = message;
    }
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

    const output = String(stderr || stdout || "");
    const message = output.toLowerCase();
    if (message.includes("invalid password") || message.includes("incorrect password")) {
      job.status = "error";
      job.errorCode = "incorrect_password";
      job.errorMessage = "Incorrect PDF password.";
      registerPasswordFailure(ip);
    } else if (signal === "SIGTERM") {
      job.status = "canceled";
      job.errorCode = "canceled";
      job.errorMessage = "Unlock canceled.";
    } else if (
      (message.includes("qpdf") && message.includes("not found")) ||
      message.includes("spawn qpdf enoent") ||
      message.includes("command not found")
    ) {
      job.status = "error";
      job.errorCode = "qpdf_missing";
      job.errorMessage = "qpdf is not installed on the server.";
    } else {
      job.status = "error";
      job.errorCode = "unlock_failed";
      job.errorMessage = summarizeQpdfFailure(output, code, signal);
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
    const outName = toSafeDownloadName(job.originalName.replace(/\.pdf$/i, "") + "-unlocked.pdf", "unlocked.pdf");
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
  app.set("trust proxy", trustProxySetting);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UNLOCK_UPLOAD_BYTES }
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

  app.options("/api/unlock-pdf/*", (req, res) => {
    if (!applyCors(req, res) && !allowAnyOrigin) {
      res.status(403).json({ error: "Origin not allowed." });
      return;
    }
    res.status(204).end();
  });

  app.post("/api/unlock-pdf/start", enforceUnlockOrigin, enforceUnlockRateLimit, upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "PDF file is required." });
      return;
    }
    if (!isAllowedPdfUpload(req.file)) {
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

  app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `Upload limit: PDF must be ${Math.round(MAX_UNLOCK_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`
      });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.message || "Upload failed." });
      return;
    }
    next(error);
  });

  app.use((error, req, res, _next) => {
    const isApi = String(req.path || "").startsWith("/api/");
    if (isApi) {
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    res.status(500).send("Internal server error.");
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
