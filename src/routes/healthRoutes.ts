import { Router } from "express";
import { checkHealth } from "@/controllers/healthController";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: System & Database Health Check
 *     description: Returns the operational status of the server and PostgreSQL connection.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: All systems operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-09-16T06:25:00.000Z"
 *                 uptime:
 *                   type: string
 *                   example: "124s"
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     latency:
 *                       type: string
 *                       example: "3ms"
 *                 responseTime:
 *                   type: string
 *                   example: "5ms"
 *       503:
 *         description: Database disconnected or degraded performance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: degraded
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: unhealthy
 */
router.get("/", checkHealth);

export default router;
