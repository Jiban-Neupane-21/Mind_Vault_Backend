// src/routes/communityRoutes.ts

import { Router } from 'express';
import {
  createCommunity,
  getCommunities,
  joinCommunity,
  updateCommunity,
  leaveCommunity,
  removeCommunityMember,
  
} from '@/controllers/communityController';

import {
  createPost,
  getCommunityPosts,
  getHomeFeed,
  updatePost,
} from '@/controllers/postCommunityController';

import {
  authenticate,
  optionalAuth,
} from '@/middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Communities
 *     description: Community creation, management, listing, and membership
 *   - name: Community Posts
 *     description: Polymorphic post creation (thought, quote, site) and feeds
 *
 * components:
 *   schemas:
 *
 *     Community:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 8b1fa810-f050-491f-bef5-325820bc7140
 *         name:
 *           type: string
 *           example: Web Development
 *         slug:
 *           type: string
 *           example: web-development
 *         description:
 *           type: string
 *           nullable: true
 *           example: Discuss modern web technologies, tools, and best practices.
 *         icon_url:
 *           type: string
 *           nullable: true
 *           example: https://example.com/icons/webdev.png
 *         creator_id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-09-22T03:02:08.388Z
 *         member_count:
 *           type: integer
 *           example: 42
 *
 *     CreateCommunityDTO:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 80
 *           example: Web Development
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: All things frontend, backend, and full-stack engineering.
 *         icon_url:
 *           type: string
 *           nullable: true
 *           example: https://example.com/icons/webdev.png
 *
 *     UpdateCommunityDTO:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 80
 *           example: Modern Web Development
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           example: A community for frontend, backend, and full-stack developers.
 *         icon_url:
 *           type: string
 *           nullable: true
 *           example: https://example.com/icons/webdev-new.png
 *
 *     PostMetadata:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: Required if post_type is 'site'
 *           example: https://ray.so
 *         author:
 *           type: string
 *           description: Required if post_type is 'quote'
 *           example: Edsger W. Dijkstra
 *         source:
 *           type: string
 *           example: The Humble Programmer
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - javascript
 *             - performance
 *
 *     CreatePostDTO:
 *       type: object
 *       required:
 *         - post_type
 *         - title
 *       properties:
 *         post_type:
 *           type: string
 *           enum:
 *             - thought
 *             - quote
 *             - site
 *           example: thought
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: Why server actions simplify state management
 *         content:
 *           type: string
 *           description: Required for thoughts and quotes
 *           example: Colocating server mutations with components reduces boilerplate.
 *         metadata:
 *           $ref: '#/components/schemas/PostMetadata'
 *
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         community_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         author_name:
 *           type: string
 *           example: Jiban
 *         community_name:
 *           type: string
 *           example: Web Development
 *         community_slug:
 *           type: string
 *           example: web-development
 *         post_type:
 *           type: string
 *           enum:
 *             - thought
 *             - quote
 *             - site
 *         title:
 *           type: string
 *           example: Why server actions simplify state management
 *         content:
 *           type: string
 *           nullable: true
 *         metadata:
 *           $ref: '#/components/schemas/PostMetadata'
 *         created_at:
 *           type: string
 *           format: date-time
 */


/*
|--------------------------------------------------------------------------
| COMMUNITY ENDPOINTS
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Get all communities
 *     description: Get a list of all communities with their member count.
 *     tags:
 *       - Communities
 *     responses:
 *       200:
 *         description: List of all communities with their member count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 communities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Community'
 *       500:
 *         description: Server error
 */
router.get('/', getCommunities);


/**
 * @swagger
 * /api/communities:
 *   post:
 *     summary: Create a new community
 *     description: Create a new community. The authenticated user automatically becomes the community admin.
 *     tags:
 *       - Communities
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommunityDTO'
 *     responses:
 *       201:
 *         description: Community created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Community created successfully.
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Community with this slug/name already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, createCommunity);


/**
 * @swagger
 * /api/communities/{id}:
 *   patch:
 *     summary: Update a community
 *     description: Update community information. Only the community admin/creator can perform this operation.
 *     tags:
 *       - Communities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the community to update
 *         example: 8b1fa810-f050-491f-bef5-325820bc7140
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommunityDTO'
 *     responses:
 *       200:
 *         description: Community updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Community updated successfully.
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       400:
 *         description: Invalid input or no fields provided for update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the community admin can update the community
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', authenticate, updateCommunity);


/**
 * @swagger
 * /api/communities/{id}/join:
 *   post:
 *     summary: Join a community
 *     description: Join an existing community as a standard member.
 *     tags:
 *       - Communities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the community to join
 *         example: 8b1fa810-f050-491f-bef5-325820bc7140
 *     responses:
 *       200:
 *         description: User is already a member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You are already a member of this community.
 *       201:
 *         description: Successfully joined the community
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Joined community successfully.
 *                 membership:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.post('/:id/join', authenticate, joinCommunity);


/**
 * @swagger
 * /api/communities/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a community
 *     description: Remove a member from the community. Only the community admin/creator can perform this operation.
 *     tags:
 *       - Communities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the community
 *         example: 8b1fa810-f050-491f-bef5-325820bc7140
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the member to remove
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member removed from community successfully.
 *       400:
 *         description: Admin cannot remove themselves
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the community admin can remove members
 *       404:
 *         description: Community or member not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/members/:userId',
  authenticate,
  removeCommunityMember
);


/**
 * @swagger
 * /api/communities/{id}/leave:
 *   delete:
 *     summary: Leave a community
 *     description: Allow an authenticated member to leave a community. The community admin cannot leave unless ownership is transferred first.
 *     tags:
 *       - Communities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the community to leave
 *         example: 8b1fa810-f050-491f-bef5-325820bc7140
 *     responses:
 *       200:
 *         description: Successfully left the community
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You have left the community successfully.
 *       400:
 *         description: Community admin cannot leave the community
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community or membership not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/leave',
  authenticate,
  leaveCommunity
);


/*
|--------------------------------------------------------------------------
| COMMUNITY POST & FEED ENDPOINTS
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/communities/{communityId}/posts:
 *   post:
 *     summary: Create a post (thought, quote, or site) inside a community
 *     description: Create a post inside a community. The user must be authenticated.
 *     tags:
 *       - Community Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the target community
 *         example: 8b1fa810-f050-491f-bef5-325820bc7140
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostDTO'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post created successfully.
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation failed (missing fields or invalid metadata)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:communityId/posts',
  authenticate,
  createPost
);


/**
 * @swagger
 * /api/communities/{slug}/posts:
 *   get:
 *     summary: Get paginated posts from a specific community
 *     description: Get posts belonging to a specific community using its unique slug.
 *     tags:
 *       - Community Posts
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique slug of the community
 *         example: web-development
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: Community posts fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       500:
 *         description: Server error
 */
router.get(
  '/:slug/posts',
  getCommunityPosts
);


/**
 * @swagger
 * /api/communities/feed/home:
 *   get:
 *     summary: Get unified home feed
 *     description: Authenticated users receive posts from joined communities. Guests receive trending posts.
 *     tags:
 *       - Community Posts
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: Aggregated home feed posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 feed:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       500:
 *         description: Server error
 */
router.get(
  '/feed/home',
  optionalAuth,
  getHomeFeed
);

/**
 * @swagger
 * /api/communities/posts/{postId}:
 *   put:
 *     summary: Update an existing post (Author, Community Admin/Mod, or Superadmin only)
 *     tags: [Community Posts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the post to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostDTO'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the author or moderator)
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.put('/posts/:postId', authenticate, updatePost);

export default router;