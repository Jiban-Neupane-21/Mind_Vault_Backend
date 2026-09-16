import { Router } from "express";
import {
  createThought,
  getPublicThoughts,
  getMyThoughts,
  getThoughtById,
  updateThought,
  deleteThought,
} from "@/controllers/thoughtController";
import { authenticate } from "@/middleware/authMiddleware";
import { optionalAuthenticate } from "@/middleware/optionalMiddleware";

const router = Router();

/**
 * @openapi
 * /api/thoughts/public:
 *   get:
 *     summary: Retrieve all public thoughts
 *     tags:
 *       - Thoughts
 *     responses:
 *       200:
 *         description: List of public thoughts
 *       500:
 *         description: Internal server error
 */
router.get("/public", getPublicThoughts);

/**
 * @openapi
 * /api/thoughts/my:
 *   get:
 *     summary: Retrieve all thoughts created by the authenticated user
 *     tags:
 *       - Thoughts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user thoughts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/my", authenticate, getMyThoughts);

/**
 * @openapi
 * /api/thoughts:
 *   post:
 *     summary: Create a thought (Authenticated or Guest)
 *     tags:
 *       - Thoughts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Building step-by-step keeps architecture clean."
 *               is_public:
 *                 type: boolean
 *                 default: true
 *               is_anonymous:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Thought created. Returns edit_token if submitted by a guest.
 *       400:
 *         description: Missing or invalid content
 *       401:
 *         description: Unauthorized (guests cannot create private thoughts)
 *       500:
 *         description: Internal server error
 */
router.post("/", optionalAuthenticate, createThought);

/**
 * @openapi
 * /api/thoughts/{id}:
 *   get:
 *     summary: Retrieve a single thought by ID
 *     tags:
 *       - Thoughts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thought retrieved successfully
 *       403:
 *         description: Forbidden (private thought belonging to another user)
 *       404:
 *         description: Thought not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", optionalAuthenticate, getThoughtById);

/**
 * @openapi
 * /api/thoughts/{id}:
 *   put:
 *     summary: Update an existing thought
 *     description: Editable by the original user (Bearer token) or guest with x-edit-token header.
 *     tags:
 *       - Thoughts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-edit-token
 *         required: false
 *         description: Secret edit token given when the thought was created anonymously
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               is_public:
 *                 type: boolean
 *               is_anonymous:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Thought updated successfully
 *       403:
 *         description: Forbidden (invalid token or unauthorized)
 *       404:
 *         description: Thought not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", optionalAuthenticate, updateThought);

/**
 * @openapi
 * /api/thoughts/{id}:
 *   delete:
 *     summary: Delete a thought
 *     description: Deletable by author, Admin, or guest with matching x-edit-token header.
 *     tags:
 *       - Thoughts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-edit-token
 *         required: false
 *         description: Secret edit token given when the thought was created anonymously
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thought deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Thought not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", optionalAuthenticate, deleteThought);

export default router;
