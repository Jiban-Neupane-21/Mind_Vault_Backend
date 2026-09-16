import { Request, Response } from "express";
import crypto from "crypto";
import { query } from "@/config/db";
import {
  Thought,
  ThoughtResponse,
  CreateThoughtDTO,
  UpdateThoughtDTO,
} from "@/types/thought";

// Helper to create SHA-256 hash
const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createThought = async (
  req: Request<{}, {}, CreateThoughtDTO>,
  res: Response,
): Promise<void> => {
  try {
    const { content, is_public = true, is_anonymous = false } = req.body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ error: "Thought content is required." });
      return;
    }

    const userId = req.user ? req.user.id : null;

    // Guests are not permitted to create private thoughts
    if (!is_public && !userId) {
      res.status(401).json({
        error: "Authentication is required to create private thoughts.",
      });
      return;
    }

    // Force anonymous if the author has no account
    const shouldBeAnonymous = !userId ? true : Boolean(is_anonymous);

    // Generate secret edit token for unauthenticated guests
    let rawEditToken: string | null = null;
    let editTokenHash: string | null = null;

    if (!userId) {
      rawEditToken = crypto.randomBytes(32).toString("hex");
      editTokenHash = hashToken(rawEditToken);
    }

    // Fixed: All 5 parameters supplied
    const result = await query<Thought>(
      `INSERT INTO thoughts (user_id, content, is_public, is_anonymous, edit_token_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, content, is_public, is_anonymous, created_at, updated_at`,
      [userId, content.trim(), is_public, shouldBeAnonymous, editTokenHash],
    );

    res.status(201).json({
      message: "Thought created successfully.",
      thought: result.rows[0],
      ...(rawEditToken && {
        edit_token: rawEditToken,
        note: "Save this edit_token. It is required to update or delete this thought as a guest.",
      }),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};

export const getPublicThoughts = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await query<ThoughtResponse>(
      `SELECT 
         t.id,
         t.content,
         t.is_public,
         t.is_anonymous,
         t.created_at,
         t.updated_at,
         CASE 
           WHEN t.is_anonymous = TRUE THEN NULL 
           ELSE u.name 
         END AS author_name
       FROM thoughts t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.is_public = TRUE
       ORDER BY t.created_at DESC`,
    );

    res.status(200).json({
      total: result.rows.length,
      thoughts: result.rows,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};

export const getMyThoughts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const result = await query<Thought>(
      `SELECT id, user_id, content, is_public, is_anonymous, created_at, updated_at
       FROM thoughts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    res.status(200).json({
      total: result.rows.length,
      thoughts: result.rows,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};

// 1. GET SINGLE THOUGHT BY ID
export const getThoughtById = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await query<ThoughtResponse & { user_id: string | null }>(
      `SELECT 
         t.id,
         t.user_id,
         t.content,
         t.is_public,
         t.is_anonymous,
         t.created_at,
         t.updated_at,
         CASE 
           WHEN t.is_anonymous = TRUE THEN NULL 
           ELSE u.name 
         END AS author_name
       FROM thoughts t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Thought not found." });
      return;
    }

    const thought = result.rows[0]!;

    if (!thought.is_public && thought.user_id !== userId) {
      res
        .status(403)
        .json({ error: "You do not have permission to view this thought." });
      return;
    }

    const { user_id, ...cleanThought } = thought;
    res.status(200).json({ thought: cleanThought });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

// 2. UPDATE THOUGHT (Fixed for guest tokens)
export const updateThought = async (
  req: Request<{ id: string }, {}, UpdateThoughtDTO>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, is_public, is_anonymous } = req.body;
    const guestToken = req.headers["x-edit-token"] as string | undefined;

    const existing = await query<Thought>(
      "SELECT * FROM thoughts WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Thought not found." });
      return;
    }

    const thought = existing.rows[0]!;

    // Check permissions: Owner OR Valid Guest Token
    const isOwner = req.user && thought.user_id === req.user.id;
    const isValidGuest =
      !thought.user_id &&
      thought.edit_token_hash &&
      guestToken &&
      hashToken(guestToken) === thought.edit_token_hash;

    if (!isOwner && !isValidGuest) {
      res.status(403).json({
        error: "Forbidden: You do not have permission to edit this thought.",
      });
      return;
    }

    // Guests cannot turn a public thought private
    const updatedPublic = !thought.user_id
      ? true
      : is_public !== undefined
        ? is_public
        : thought.is_public;

    const updatedContent =
      content !== undefined ? content.trim() : thought.content;
    const updatedAnonymous =
      is_anonymous !== undefined ? is_anonymous : thought.is_anonymous;

    const result = await query<Thought>(
      `UPDATE thoughts
       SET content = $1, is_public = $2, is_anonymous = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, user_id, content, is_public, is_anonymous, created_at, updated_at`,
      [updatedContent, updatedPublic, updatedAnonymous, id],
    );

    res.status(200).json({
      message: "Thought updated successfully.",
      thought: result.rows[0],
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

// 3. DELETE THOUGHT (Fixed for guest tokens & admin)
export const deleteThought = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const guestToken = req.headers["x-edit-token"] as string | undefined;

    const existing = await query<Thought>(
      "SELECT * FROM thoughts WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Thought not found." });
      return;
    }

    const thought = existing.rows[0]!;

    const isOwner = req.user && thought.user_id === req.user.id;
    const isAdmin = req.user && req.user.role === "Admin";
    const isValidGuest =
      !thought.user_id &&
      thought.edit_token_hash &&
      guestToken &&
      hashToken(guestToken) === thought.edit_token_hash;

    if (!isOwner && !isAdmin && !isValidGuest) {
      res.status(403).json({
        error: "Forbidden: You do not have permission to delete this thought.",
      });
      return;
    }

    await query("DELETE FROM thoughts WHERE id = $1", [id]);

    res.status(200).json({ message: "Thought deleted successfully." });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};
