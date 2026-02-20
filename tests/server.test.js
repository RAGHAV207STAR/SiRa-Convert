import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../server.js";

const app = createApp();

test("GET /api/health returns ok", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("POST /api/unlock-pdf/start without file returns 400", async () => {
  const response = await request(app)
    .post("/api/unlock-pdf/start")
    .field("password", "1234");
  assert.equal(response.status, 400);
  assert.match(String(response.body.error || ""), /file is required/i);
});

test("POST /api/unlock-pdf/start with non-PDF file returns 400", async () => {
  const response = await request(app)
    .post("/api/unlock-pdf/start")
    .field("password", "1234")
    .attach("file", Buffer.from("not a pdf"), { filename: "file.txt", contentType: "text/plain" });
  assert.equal(response.status, 400);
  assert.match(String(response.body.error || ""), /only pdf/i);
});

test("POST /api/unlock-pdf/cancel/:jobId unknown job returns 404", async () => {
  const response = await request(app).post("/api/unlock-pdf/cancel/does-not-exist");
  assert.equal(response.status, 404);
});

test("GET /api/unlock-pdf/result/:jobId unknown job returns 404", async () => {
  const response = await request(app).get("/api/unlock-pdf/result/does-not-exist");
  assert.equal(response.status, 404);
});
