import request from "supertest";
import app from "@/app";
import { signToken } from "@/utils/token";
import { pool } from "@/config/db";

// Allow up to 15s for remote database round-trips in tests
jest.setTimeout(15000);

describe("Admin Analytics & Visitor Tracking Integration", () => {
  const adminToken = signToken({
    id: "00000000-0000-0000-0000-000000000001",
    role: "Admin",
  });

  const userToken = signToken({
    id: "00000000-0000-0000-0000-000000000002",
    role: "User",
  });

  // Cleanly close database connections after all tests run
  afterAll(async () => {
    await pool.end();
  });

  describe("Visitor Tracking Middleware", () => {
    it("should assign a new x-visitor-id header on first visit", async () => {
      const res = await request(app).get("/api/quotes");
      expect(res.headers["x-visitor-id"]).toBeDefined();
    }, 15000); // 15-second explicit timeout for first cold query

    it("should persist existing x-visitor-id for repeat visitors", async () => {
      const firstRes = await request(app).get("/api/quotes");
      const visitorId = firstRes.headers["x-visitor-id"] as string;

      expect(visitorId).toBeDefined();

      const repeatRes = await request(app)
        .get("/api/quotes")
        .set("x-visitor-id", visitorId);

      expect(repeatRes.headers["x-visitor-id"]).toBe(visitorId);
    });
  });

  describe("GET /api/admin/analytics/visitors", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/analytics/visitors");
      expect(res.status).toBe(401);
    });

    it("should reject non-admin users with 403", async () => {
      const res = await request(app)
        .get("/api/admin/analytics/visitors")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it("should allow admin and return visitor metric counts", async () => {
      const res = await request(app)
        .get("/api/admin/analytics/visitors")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalVisitors");
      expect(res.body).toHaveProperty("newVisitors");
      expect(res.body).toHaveProperty("repeatVisitors");
      expect(res.body).toHaveProperty("activeToday");
    });
  });
});
