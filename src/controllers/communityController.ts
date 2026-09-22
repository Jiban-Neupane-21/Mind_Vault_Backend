// src/controllers/communityController.ts
import { Request, Response } from 'express';
import {pool} from '@/config/db'; 
import {
  slugify,
  validateCommunityInput,
} from '@/validators/communityValidator';
import {   CreateCommunityDTO,CreatePostDTO, PostType, ValidationResult, UpdateCommunityDTO } from '@/types/community';
import { TokenPayload } from '@/utils/token';

// Extend Express Request to include authenticated user if not globally typed
interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  
  userId?: string;
}

/**
 * Helper to extract user ID regardless of auth middleware format
 */
const getAuthUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.userId || null;
};

/**
 * POST /api/communities
 * Create a new community and assign creator as admin
 */
export const createCommunity = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User authentication required.' });
  }

  const { name, description, icon_url }: CreateCommunityDTO = req.body;

  const validation = validateCommunityInput({ name, description });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const slug = slugify(name);
  const client = await pool.connect();

  try {
    // Check if slug already exists
    const existingCheck = await client.query('SELECT id FROM communities WHERE slug = $1', [slug]);
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'A community with this name or similar already exists.' });
    }

    // Begin transaction
    await client.query('BEGIN');

    const insertCommunityQuery = `
      INSERT INTO communities (name, slug, description, icon_url, creator_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, slug, description, icon_url, creator_id, created_at;
    `;
    const communityResult = await client.query(insertCommunityQuery, [
      name.trim(),
      slug,
      description?.trim() || null,
      icon_url?.trim() || null,
      userId
    ]);
    const community = communityResult.rows[0];

    // Auto-enroll creator as admin member
    const insertMemberQuery = `
      INSERT INTO community_members (community_id, user_id, role)
      VALUES ($1, $2, 'admin');
    `;
    await client.query(insertMemberQuery, [community.id, userId]);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Community created successfully.',
      community
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in createCommunity:', error);
    return res.status(500).json({ error: 'Internal server error while creating community.' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/communities/:id
 * Update a community
 * Only the community creator/admin can update it.
 */
export const updateCommunity = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized. User authentication required.',
    });
  }

  const { id: communityId } = req.params;

  const {
    name,
    description,
    icon_url,
  }: UpdateCommunityDTO = req.body;

  try {
    // Verify community exists and requester is the creator/admin
    const communityCheck = await pool.query(
      `
      SELECT id, name, slug, description, icon_url, creator_id, created_at
      FROM communities
      WHERE id = $1
      `,
      [communityId]
    );

    if (communityCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Community not found.',
      });
    }

    const community = communityCheck.rows[0];

    if (community.creator_id !== userId) {
      return res.status(403).json({
        error: 'You do not have permission to update this community.',
      });
    }

    // At least one field must be provided
    if (
      name === undefined &&
      description === undefined &&
      icon_url === undefined
    ) {
      return res.status(400).json({
        error: 'At least one field must be provided for update.',
      });
    }

    // Validate name if supplied
    if (name !== undefined) {
      const validation = validateCommunityInput({
        name,
        description:
          description !== undefined
            ? description
            : community.description,
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.message,
        });
      }
    }

    // Keep existing values when fields aren't supplied
    const updatedName =
      name !== undefined ? name.trim() : community.name;

    const updatedDescription =
      description !== undefined
        ? description.trim() || null
        : community.description;

    const updatedIconUrl =
      icon_url !== undefined
        ? icon_url?.trim() || null
        : community.icon_url;

    // Check duplicate name/slug only if name changes
    if (name !== undefined && updatedName !== community.name) {
      const newSlug = slugify(updatedName);

      const existingCheck = await pool.query(
        `
        SELECT id
        FROM communities
        WHERE slug = $1
          AND id <> $2
        `,
        [newSlug, communityId]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'A community with this name or similar already exists.',
        });
      }

      const updateQuery = `
        UPDATE communities
        SET
          name = $1,
          slug = $2,
          description = $3,
          icon_url = $4
        WHERE id = $5
        RETURNING
          id,
          name,
          slug,
          description,
          icon_url,
          creator_id,
          created_at;
      `;

      const result = await pool.query(updateQuery, [
        updatedName,
        newSlug,
        updatedDescription,
        updatedIconUrl,
        communityId,
      ]);

      return res.status(200).json({
        message: 'Community updated successfully.',
        community: result.rows[0],
      });
    }

    // Name didn't change, so don't regenerate slug
    const updateQuery = `
      UPDATE communities
      SET
        description = $1,
        icon_url = $2
      WHERE id = $3
      RETURNING
        id,
        name,
        slug,
        description,
        icon_url,
        creator_id,
        created_at;
    `;

    const result = await pool.query(updateQuery, [
      updatedDescription,
      updatedIconUrl,
      communityId,
    ]);

    return res.status(200).json({
      message: 'Community updated successfully.',
      community: result.rows[0],
    });
  } catch (error) {
    console.error('Error in updateCommunity:', error);

    return res.status(500).json({
      error: 'Internal server error while updating community.',
    });
  }
};

/**
 * GET /api/communities
 * List all communities with member counts (Public)
 */
export const getCommunities = async (req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon_url,
        c.created_at,
        COUNT(cm.id)::int AS member_count
      FROM communities c
      LEFT JOIN community_members cm ON c.id = cm.community_id
      GROUP BY c.id
      ORDER BY member_count DESC, c.created_at DESC;
    `;

    const result = await pool.query(query);
    return res.status(200).json({ communities: result.rows });
  } catch (error) {
    console.error('Error in getCommunities:', error);
    return res.status(500).json({ error: 'Internal server error while fetching communities.' });
  }
};

/**
 * POST /api/communities/:id/join
 * Join a community as a standard member
 */
export const joinCommunity = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { id: communityId } = req.params;

  try {
    // Verify target community exists
    const commCheck = await pool.query('SELECT id FROM communities WHERE id = $1', [communityId]);
    if (commCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found.' });
    }

    // Insert membership or do nothing if already joined
    const insertQuery = `
      INSERT INTO community_members (community_id, user_id, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT (community_id, user_id) DO NOTHING
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [communityId, userId]);

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'You are already a member of this community.' });
    }

    return res.status(201).json({ message: 'Joined community successfully.', membership: result.rows[0] });
  } catch (error) {
    console.error('Error in joinCommunity:', error);
    return res.status(500).json({ error: 'Internal server error while joining community.' });
  }
};

/**
 * DELETE /api/communities/:id/members/:userId
 * Remove a member from a community.
 * Only the community creator/admin can do this.
 */
export const removeCommunityMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const adminId = getAuthUserId(req);

  if (!adminId) {
    return res.status(401).json({
      error: 'Unauthorized.',
    });
  }

  const { id: communityId, userId: memberId } = req.params;

  try {
    // Verify community exists and requester is the creator/admin
    const communityCheck = await pool.query(
      `
      SELECT id, creator_id
      FROM communities
      WHERE id = $1
      `,
      [communityId]
    );

    if (communityCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Community not found.',
      });
    }

    const community = communityCheck.rows[0];

    if (community.creator_id !== adminId) {
      return res.status(403).json({
        error: 'Only the community admin can remove members.',
      });
    }

    // Prevent admin from removing themselves
    if (memberId === adminId) {
      return res.status(400).json({
        error:
          'The community admin cannot remove themselves. Use the ownership transfer process instead.',
      });
    }

    // Check membership
    const memberCheck = await pool.query(
      `
      SELECT id, user_id, role
      FROM community_members
      WHERE community_id = $1
        AND user_id = $2
      `,
      [communityId, memberId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'This user is not a member of the community.',
      });
    }

    await pool.query(
      `
      DELETE FROM community_members
      WHERE community_id = $1
        AND user_id = $2
      `,
      [communityId, memberId]
    );

    return res.status(200).json({
      message: 'Member removed from community successfully.',
    });
  } catch (error) {
    console.error('Error in removeCommunityMember:', error);

    return res.status(500).json({
      error: 'Internal server error while removing community member.',
    });
  }
};

/**
 * DELETE /api/communities/:id/leave
 * Leave a community as the authenticated user.
 */
export const leaveCommunity = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized.',
    });
  }

  const { id: communityId } = req.params;

  try {
    // Verify community exists
    const communityCheck = await pool.query(
      `
      SELECT id, creator_id
      FROM communities
      WHERE id = $1
      `,
      [communityId]
    );

    if (communityCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Community not found.',
      });
    }

    const community = communityCheck.rows[0];

    // Prevent creator/admin from leaving
    if (community.creator_id === userId) {
      return res.status(400).json({
        error:
          'Community admin cannot leave the community. Transfer ownership first.',
      });
    }

    // Delete user's membership
    const result = await pool.query(
      `
      DELETE FROM community_members
      WHERE community_id = $1
        AND user_id = $2
      RETURNING id;
      `,
      [communityId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'You are not a member of this community.',
      });
    }

    return res.status(200).json({
      message: 'You have left the community successfully.',
    });
  } catch (error) {
    console.error('Error in leaveCommunity:', error);

    return res.status(500).json({
      error: 'Internal server error while leaving community.',
    });
  }
};