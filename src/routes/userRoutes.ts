import { Router } from 'express';
import { getProfile } from '@/controllers/userController';
import { authenticate } from '@/middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Retrieve current authenticated user profile
 *     tags: [Users]
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
router.get('/me', authenticate, getProfile);

export default router;