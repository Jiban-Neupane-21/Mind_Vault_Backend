import { Request, Response, NextFunction } from "express";
import { query } from "@/config/db";

export const trackVisitor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Skip background checks, health probes, and admin dashboard requests
  if (
    req.path.startsWith("/api/admin") ||
    req.path === "/api/health" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  let visitorId = req.headers["x-visitor-id"] as string;
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"] || "";

  try {
    if (visitorId) {
      // Existing visitor: increment visits and update timestamp
      const result = await query(
        `UPDATE visitors
         SET last_seen_at = NOW(),
             visit_count = visit_count + 1
         WHERE id = $1
         RETURNING id`,
        [visitorId],
      );

      // If ID not found in database, clear it so a fresh one is assigned
      if (result.rows.length === 0) {
        visitorId = "";
      }
    }
    if (!visitorId) {
      // New visitor: generate new record
      const insertResult = await query<{ id: string }>(
        `INSERT INTO visitors (visit_count)
         VALUES (1)
         RETURNING id`,
      );

      const newVisitor = insertResult.rows[0];
      if (!newVisitor) {
        return next();
      }
      visitorId = newVisitor.id;
    }

    // Expose header so the client can store it (e.g. in localStorage)
    res.setHeader("x-visitor-id", visitorId);
    res.setHeader("Access-Control-Expose-Headers", "x-visitor-id");

    // Record visit log asynchronously without blocking
    query(
      `INSERT INTO visitor_logs (visitor_id, path, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [visitorId, req.path, ip, userAgent],
    ).catch((logErr) => console.error("Error inserting visitor log:", logErr));

    next();
  } catch (error) {
    // Tracking errors must never block normal API flow
    console.error("Visitor tracking middleware error:", error);
    next();
  }
};
