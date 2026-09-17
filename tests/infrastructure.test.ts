import request from "supertest";
import app from "../src/app";
import { pool } from "../src/config/db";

describe("API Infrastructure & Security Integration Tests", () => {
  // Close database pool after all tests run to avoid open handles
  afterAll(async () => {
    await pool.end();
  });

  describe("GET /api/health", () => {
    it("should return 200 OK and healthy status", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  describe("Security Headers (Helmet)", () => {
    it("should include standard security headers on API responses", async () => {
      const res = await request(app).get("/api/health");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });
  });

  describe("Catch-all 404 Handler", () => {
    it("should return standardized 404 error format for unmapped routes", async () => {
      const res = await request(app).get("/api/unmapped-endpoint-xyz");

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        status: "fail",
        code: "NOT_FOUND",
      });
      expect(res.body.message).toContain(
        "Cannot find /api/unmapped-endpoint-xyz",
      );
    });
  });

  describe("Zod Validation Middleware Interception", () => {
    it("should return 400 when an invalid UUID format is supplied to /api/quotes/:id", async () => {
      const res = await request(app).get("/api/quotes/invalid-uuid-format");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body).toHaveProperty("errors");
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });
});
