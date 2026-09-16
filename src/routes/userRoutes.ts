import { Router } from "express";
import { getProfile, getAllUsers } from "@/controllers/userController";
import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Retrieve current authenticated user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *       401:
 *         description: Unauthorized or missing/invalid token
 *       404:
 *         description: User not found
 */
router.get("/me", authenticate, getProfile);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Retrieve all users (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin role
 */
router.get("/", authenticate, authorize("Admin"), getAllUsers);

export default router;
