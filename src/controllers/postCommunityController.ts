// src/controllers/postController.ts
import { Request, Response } from 'express';
import {pool} from '../config/db'; // Adjust path to your db pool file
import { validatePostInput } from '@/validators/communityValidator';
import { CreatePostDTO, PostType, ValidationResult } from '../types/community';
import { TokenPayload } from '@/utils/token'; // Adjust path to your token.ts

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  userId?: string;
}

const getAuthUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.userId || null;
};

/**
 * POST /api/communities/:communityId/posts
 * Create a polymorphic post (thought, quote, site) inside a community
 */
export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const { communityId } = req.params;
  const { post_type, title, content, metadata }: CreatePostDTO = req.body;

  // 1. Validate payload
  const validation = validatePostInput({ post_type, title, content, metadata });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    // 2. Verify target community exists
    const commCheck = await pool.query('SELECT id FROM communities WHERE id = $1', [communityId]);
    if (commCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found.' });
    }

    // 3. Insert post
    const insertQuery = `
      INSERT INTO posts (community_id, user_id, post_type, title, content, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, community_id, user_id, post_type, title, content, metadata, created_at;
    `;

    const result = await pool.query(insertQuery, [
      communityId,
      userId,
      post_type,
      title.trim(),
      content ? content.trim() : null,
      JSON.stringify(metadata || {})
    ]);

    return res.status(201).json({
      message: 'Post created successfully.',
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    return res.status(500).json({ error: 'Internal server error while creating post.' });
  }
};

/**
 * GET /api/communities/:slug/posts
 * Fetch paginated posts belonging to a specific community
 */
export const getCommunityPosts = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;

  try {
    const query = `
      SELECT 
        p.id,
        p.post_type,
        p.title,
        p.content,
        p.metadata,
        p.created_at,
        u.id AS author_id,
        u.name AS author_name,
        c.id AS community_id,
        c.name AS community_name,
        c.slug AS community_slug
      FROM posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.id = p.user_id
      WHERE c.slug = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [slug, limit, offset]);

    return res.status(200).json({
      page,
      limit,
      count: result.rows.length,
      posts: result.rows
    });
  } catch (error) {
    console.error('Error in getCommunityPosts:', error);
    return res.status(500).json({ error: 'Internal server error while fetching community posts.' });
  }
};

/**
 * GET /api/feed/home
 * Unified home feed:
 * - If authenticated: posts from joined communities (or global fallback if none joined)
 * - If guest: latest posts from all communities
 */
export const getHomeFeed = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const userId = getAuthUserId(req);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;

  try {
    let query: string;
    let params: unknown[];

    if (userId) {
      // Check if user has joined any communities
      const joinedCheck = await pool.query(
        'SELECT 1 FROM community_members WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (joinedCheck.rows.length > 0) {
        // Feed from joined communities
        query = `
          SELECT 
            p.id,
            p.post_type,
            p.title,
            p.content,
            p.metadata,
            p.created_at,
            u.id AS author_id,
            u.name AS author_name,
            c.id AS community_id,
            c.name AS community_name,
            c.slug AS community_slug
          FROM posts p
          JOIN communities c ON c.id = p.community_id
          JOIN users u ON u.id = p.user_id
          INNER JOIN community_members cm ON cm.community_id = p.community_id
          WHERE cm.user_id = $1
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3;
        `;
        params = [userId, limit, offset];
      } else {
        // Global feed fallback for users who haven't joined any yet
        query = `
          SELECT 
            p.id,
            p.post_type,
            p.title,
            p.content,
            p.metadata,
            p.created_at,
            u.id AS author_id,
            u.name AS author_name,
            c.id AS community_id,
            c.name AS community_name,
            c.slug AS community_slug
          FROM posts p
          JOIN communities c ON c.id = p.community_id
          JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC
          LIMIT $1 OFFSET $2;
        `;
        params = [limit, offset];
      }
    } else {
      // Guest feed: public latest posts
      query = `
        SELECT 
          p.id,
          p.post_type,
          p.title,
          p.content,
          p.metadata,
          p.created_at,
          u.id AS author_id,
          u.name AS author_name,
          c.id AS community_id,
          c.name AS community_name,
          c.slug AS community_slug
        FROM posts p
        JOIN communities c ON c.id = p.community_id
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `;
      params = [limit, offset];
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      page,
      limit,
      count: result.rows.length,
      feed: result.rows
    });
  } catch (error) {
    console.error('Error in getHomeFeed:', error);
    return res.status(500).json({ error: 'Internal server error while fetching feed.' });
  }
};

/**
 * PUT /api/communities/posts/:postId
 * Update an existing post if authorized (author, community mod/admin, or superadmin)
 */
export const updatePost = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const { postId } = req.params;
  const { title, content, metadata } = req.body;

  try {
    // 1. Fetch post and check community role in a single query
    const checkQuery = `
      SELECT 
        p.id,
        p.user_id AS author_id,
        p.community_id,
        p.post_type,
        cm.role AS member_role
      FROM posts p
      LEFT JOIN community_members cm 
        ON cm.community_id = p.community_id AND cm.user_id = $2
      WHERE p.id = $1;
    `;
    const checkRes = await pool.query(checkQuery, [postId, userId]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const post = checkRes.rows[0];

    // 2. Authorization Check
    const isAuthor = post.author_id === userId;
    const isCommunityStaff = ['admin', 'moderator'].includes(post.member_role);
    const isSuperAdmin = req.user?.role === 'Admin';

    if (!isAuthor && !isCommunityStaff && !isSuperAdmin) {
      return res.status(403).json({
        error: 'Forbidden. You do not have permission to edit this post.',
      });
    }

    // 3. Validate updated data against existing post_type
    const validation = validatePostInput({
      post_type: post.post_type as PostType,
      title,
      content,
      metadata,
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    // 4. Update the post
    const updateQuery = `
      UPDATE posts
      SET 
        title = $1,
        content = $2,
        metadata = $3
      WHERE id = $4
      RETURNING id, community_id, user_id, post_type, title, content, metadata, created_at;
    `;

    const updateRes = await pool.query(updateQuery, [
      title.trim(),
      content ? content.trim() : null,
      JSON.stringify(metadata || {}),
      postId,
    ]);

    return res.status(200).json({
      message: 'Post updated successfully.',
      post: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in updatePost:', error);
    return res.status(500).json({ error: 'Internal server error while updating post.' });
  }
};