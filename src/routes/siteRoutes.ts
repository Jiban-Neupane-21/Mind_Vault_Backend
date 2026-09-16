import { Router } from "express";
import {
  getCategories,
  createCategory,
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
} from "@/controllers/siteController";
import { authenticate } from "@/middleware/authMiddleware";
import { requireRole } from "@/middleware/roleMiddleware"; // Import role guard

const router = Router();

// -------------------------------------------------------------
// CATEGORY ROUTES
// -------------------------------------------------------------

/**
 * @openapi
 * /api/sites/categories:
 *   get:
 *     summary: Retrieve all site categories (Public / Guest)
 *     tags:
 *       - Useful Sites
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Internal server error
 */
router.get("/categories", getCategories);

/**
 * @openapi
 * /api/sites/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags:
 *       - Useful Sites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Development
 *               description:
 *                 type: string
 *                 example: Developer tools and documentation
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Category name is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/categories", authenticate, requireRole("Admin"), createCategory);
// -------------------------------------------------------------
// SITE ROUTES
// -------------------------------------------------------------

/**
 * @openapi
 * /api/sites:
 *   get:
 *     summary: Retrieve useful sites with pagination and search (Public / Guest)
 *     tags:
 *       - Useful Sites
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional category ID filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keywords matching site title or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of useful sites
 *       500:
 *         description: Internal server error
 */
router.get("/", getSites);

/**
 * @openapi
 * /api/sites/{id}:
 *   get:
 *     summary: Retrieve a single site by ID (Public / Guest)
 *     tags:
 *       - Useful Sites
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Site details
 *       404:
 *         description: Site not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", getSiteById);

/**
 * @openapi
 * /api/sites:
 *   post:
 *     summary: Add a new site (Authenticated users only)
 *     tags:
 *       - Useful Sites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - url
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 example: GitHub
 *               url:
 *                 type: string
 *                 example: https://github.com
 *               description:
 *                 type: string
 *                 example: Code hosting and collaboration platform
 *     responses:
 *       201:
 *         description: Site added successfully
 *       400:
 *         description: Missing title or URL
 *       401:
 *         description: Unauthorized (guests cannot add sites)
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, createSite);

/**
 * @openapi
 * /api/sites/{id}:
 *   put:
 *     summary: Update an existing site (Creator or Admin only)
 *     tags:
 *       - Useful Sites
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
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Site updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the creator or admin)
 *       404:
 *         description: Site not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", authenticate, updateSite);

/**
 * @openapi
 * /api/sites/{id}:
 *   delete:
 *     summary: Delete a site (Creator or Admin only)
 *     tags:
 *       - Useful Sites
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
 *         description: Site deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the creator or admin)
 *       404:
 *         description: Site not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, deleteSite);

export default router;
