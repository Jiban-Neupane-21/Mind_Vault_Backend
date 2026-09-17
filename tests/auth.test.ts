import request from "supertest";
import app from "@/app";
import { pool } from "@/config/db";

describe("Authentication & User Route Integration Tests", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Test Runner",
    email: `tester_${timestamp}_${Math.floor(Math.random() * 1000)}@example.com`,
    password: "Password123!",
  };

  let authToken = "";

  // Ensure clean state before running tests
  beforeAll(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    } catch (err) {
      console.error("Setup cleanup failed:", err);
    }
  });

  // Clean up database records and close pool connections after suite execution
  afterAll(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    } catch (err) {
      console.error("Failed to clean up test user:", err);
    } finally {
      await pool.end();
    }
  });

  describe("POST /api/auth/register", () => {
    it("should return 400 when body fails Zod validation", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "T", // min 2 characters required
          email: "not-an-email",
          password: "123", // min 6 characters required
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body).toHaveProperty("errors");
    });

    it("should register a new user successfully with status 201", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);

      expect(res.status).toBe(201);
    });

    it("should reject duplicate registration with 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser);

      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should fail with 401 when given an incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword999",
        });

      expect(res.status).toBe(401);
    });

    it("should authenticate valid credentials and return a JWT token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);

      authToken =
        res.body.token ||
        res.body.accessToken ||
        res.body.data?.token ||
        res.body.data?.accessToken;

      expect(authToken).toBeDefined();
      expect(typeof authToken).toBe("string");
    });
  });

  describe("Protected Route Guard: GET /api/users/me", () => {
    it("should return 401 Unauthorized when no token is provided", async () => {
      const res = await request(app).get("/api/users/me");

      expect(res.status).toBe(401);
    });

    it("should return 401 Unauthorized when an invalid token is provided", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", "Bearer invalid.jwt.token");

      expect(res.status).toBe(401);
    });

    it("should allow access and return the profile when a valid token is provided", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
});