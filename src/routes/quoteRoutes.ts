import { Router } from "express";
import { validate } from "@/middleware/validateMiddleware";
import { engagementLimiter } from "@/middleware/rateLimitMiddleware";
import {
  getRandomQuote,
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  likeQuote,
  getQuoteComments,
  addQuoteComment,
  deleteQuoteComment,
  toggleSaveQuote,
  getSavedQuotes,
  trackQuoteShare,
} from "@/controllers/quoteController";
import { authenticate } from "@/middleware/authMiddleware";
import {
  createQuoteSchema,
  updateQuoteSchema,
  createCommentSchema,
  quoteQuerySchema,
  quoteParamSchema,
  commentParamSchema,
} from "@/schemas/quoteSchemas";

const router = Router();

// -------------------------------------------------------------
// USER BOOKMARKS / SAVED QUOTES (Defined before /:id)
// -------------------------------------------------------------

/**
 * @openapi
 * /api/quotes/saved:
 *   get:
 *     summary: Retrieve current user's saved quotes collection
 *     tags:
 *       - Quotes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved quotes
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/saved", authenticate, getSavedQuotes);

// -------------------------------------------------------------
// GENERAL QUOTES
// -------------------------------------------------------------

/**
 * @openapi
 * /api/quotes/random:
 *   get:
 *     summary: Retrieve a random quote (Public / Guest)
 *     tags:
 *       - Quotes
 *     responses:
 *       200:
 *         description: Random quote retrieved successfully
 *       404:
 *         description: No quotes found in the database
 *       500:
 *         description: Internal server error
 */
router.get("/random",engagementLimiter, validate({ query: quoteQuerySchema }), getRandomQuote);

/**
 * @openapi
 * /api/quotes:
 *   get:
 *     summary: Retrieve quotes with search, tag filters, and pagination (Public / Guest)
 *     tags:
 *       - Quotes
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword matching quote text or author
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author name
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of quotes
 *       500:
 *         description: Internal server error
 */
router.get("/", validate({ query: quoteQuerySchema }), getQuotes);

/**
 * @openapi
 * /api/quotes/{id}:
 *   get:
 *     summary: Retrieve a single quote by ID (Public / Guest)
 *     tags:
 *       - Quotes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quote details
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", validate({ params: quoteParamSchema }), getQuoteById);

/**
 * @openapi
 * /api/quotes:
 *   post:
 *     summary: Submit a quote (Authenticated users only)
 *     tags:
 *       - Quotes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quote
 *             properties:
 *               quote:
 *                 type: string
 *                 example: "Simplicity is prerequisite for reliability."
 *               author:
 *                 type: string
 *                 default: "Anonymous"
 *                 example: "Edsger W. Dijkstra"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["architecture", "code"]
 *     responses:
 *       201:
 *         description: Quote submitted successfully
 *       400:
 *         description: Quote content is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  validate({ body: createQuoteSchema }),
  createQuote,
);

/**
 * @openapi
 * /api/quotes/{id}:
 *   put:
 *     summary: Update a quote (Submitter or Admin only)
 *     tags:
 *       - Quotes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quote:
 *                 type: string
 *               author:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Quote updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  authenticate,
  validate({ params: quoteParamSchema, body: updateQuoteSchema }),
  updateQuote,
);

/**
 * @openapi
 * /api/quotes/{id}:
 *   delete:
 *     summary: Delete a quote (Submitter or Admin only)
 *     tags:
 *       - Quotes
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
 *         description: Quote deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  validate({ params: quoteParamSchema }),
  authenticate,
  deleteQuote,
);

// -------------------------------------------------------------
// ENGAGEMENT (LIKE, SHARE, BOOKMARK)
// -------------------------------------------------------------

/**
 * @openapi
 * /api/quotes/{id}/like:
 *   patch:
 *     summary: Increment like count on a quote (Public / Guest)
 *     tags:
 *       - Quotes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quote liked successfully
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/like",engagementLimiter, validate({ params: quoteParamSchema }), likeQuote);

/**
 * @openapi
 * /api/quotes/{id}/share:
 *   post:
 *     summary: Track quote share count (Public / Guest)
 *     tags:
 *       - Quotes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Share count updated
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/share",
  engagementLimiter,
  validate({ params: quoteParamSchema }),
  trackQuoteShare,
);

/**
 * @openapi
 * /api/quotes/{id}/save:
 *   post:
 *     summary: Toggle save/bookmark quote (Authenticated users only)
 *     tags:
 *       - Quotes
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
 *         description: Quote removed from saved collection
 *       201:
 *         description: Quote saved to collection
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/save",
  authenticate,
  validate({ params: quoteParamSchema }),
  toggleSaveQuote,
);

// -------------------------------------------------------------
// COMMENTS
// -------------------------------------------------------------

/**
 * @openapi
 * /api/quotes/{id}/comments:
 *   get:
 *     summary: Get all comments for a quote (Public / Guest)
 *     tags:
 *       - Quotes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id/comments",
  validate({ params: quoteParamSchema }),
  getQuoteComments,
);

/**
 * @openapi
 * /api/quotes/{id}/comments:
 *   post:
 *     summary: Post a comment to a quote (Authenticated users only)
 *     tags:
 *       - Quotes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 example: "A timeless reminder for every developer."
 *     responses:
 *       201:
 *         description: Comment posted successfully
 *       400:
 *         description: Comment text is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/comments",
  authenticate,
  validate({ params: quoteParamSchema, body: createCommentSchema }),
  addQuoteComment,
);

/**
 * @openapi
 * /api/quotes/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (Author or Admin only)
 *     tags:
 *       - Quotes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.delete("/comments/:commentId", authenticate,validate({ params: commentParamSchema }), deleteQuoteComment);

export default router;
