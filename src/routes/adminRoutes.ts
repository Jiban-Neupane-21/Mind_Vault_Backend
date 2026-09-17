import { Router } from "express";
import { getVisitorStats } from "@/controllers/adminController";
import { authenticate } from "@/middleware/authMiddleware"; // Adjust to your auth middleware filename
import { requireRole } from "@/middleware/roleMiddleware"; // Adjust to your role middleware filename

const router = Router();
/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: System management and monitoring endpoints
 *
 * /api/admin/analytics/visitors:
 *   get:
 *     summary: Retrieve visitor metrics and analytics
 *     description: Returns aggregated counts of total, new, repeat, and active visitors. Requires Admin role.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated visitor statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalVisitors:
 *                   type: integer
 *                   example: 154
 *                 newVisitors:
 *                   type: integer
 *                   example: 98
 *                 repeatVisitors:
 *                   type: integer
 *                   example: 56
 *                 activeToday:
 *                   type: integer
 *                   example: 12
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - Non-admin access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: You do not have permission to perform this action."
 *       500:
 *         description: Internal server error
 */
router.get(
  "/analytics/visitors",
  authenticate,
  requireRole("Admin"),
  getVisitorStats,
);

export default router;
