import { Request, Response } from "express";
import { query } from "@/config/db";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";
import {
  Quote,
  QuoteResponse,
  CreateQuoteDTO,
  UpdateQuoteDTO,
  QuoteQueryParams,
  PaginatedQuotesResponse,
  CreateCommentDTO,
  QuoteCommentResponse,
} from "@/types/quotes";

// 1. GET RANDOM QUOTE (Public / Guest)
export const getRandomQuote = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const result = await query<QuoteResponse>(
      `SELECT 
        q.id,
        q.quote,
        q.author,
        q.tags,
        q.likes_count,
        q.submitted_by,
        q.created_at,
        q.updated_at,
        u.name AS submitter_name
      FROM quotes q
      LEFT JOIN users u ON q.submitted_by = u.id
      ORDER BY RANDOM()
      LIMIT 1`,
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "No quotes found in the database.",
        404,
        "QUOTES_EMPTY",
      );
    }

    res.status(200).json({ quote: result.rows[0]! });
  },
);

// 2. GET ALL QUOTES WITH SEARCH & PAGINATION (Public / Guest)
export const getQuotes = asyncHandler(
  async (
    req: Request<{}, {}, {}, QuoteQueryParams>,
    res: Response,
  ): Promise<void> => {
    const { search, tag, author, page = "1", limit = "10" } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNumber - 1) * limitNumber;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search && search.trim() !== "") {
      conditions.push(
        `(q.quote ILIKE $${paramIndex} OR q.author ILIKE $${paramIndex})`,
      );
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (author && author.trim() !== "") {
      conditions.push(`q.author ILIKE $${paramIndex++}`);
      values.push(`%${author.trim()}%`);
    }

    if (tag && tag.trim() !== "") {
      conditions.push(`$${paramIndex++} = ANY(q.tags)`);
      values.push(tag.trim().toLowerCase());
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(q.id) as count FROM quotes q ${whereClause}`,
      values,
    );

    const total = parseInt(countResult.rows[0]?.count || "0", 10);
    const total_pages = Math.ceil(total / limitNumber);

    const dataValues = [...values, limitNumber, offset];
    const dataResult = await query<QuoteResponse>(
      `SELECT 
        q.id,
        q.quote,
        q.author,
        q.tags,
        q.likes_count,
        q.submitted_by,
        q.created_at,
        q.updated_at,
        u.name AS submitter_name
      FROM quotes q
      LEFT JOIN users u ON q.submitted_by = u.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataValues,
    );

    const response: PaginatedQuotesResponse = {
      total,
      page: pageNumber,
      limit: limitNumber,
      total_pages,
      quotes: dataResult.rows,
    };

    res.status(200).json(response);
  },
);

// 3. GET SINGLE QUOTE BY ID (Public / Guest)
export const getQuoteById = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await query<QuoteResponse>(
      `SELECT 
        q.id,
        q.quote,
        q.author,
        q.tags,
        q.likes_count,
        q.submitted_by,
        q.created_at,
        q.updated_at,
        u.name AS submitter_name
      FROM quotes q
      LEFT JOIN users u ON q.submitted_by = u.id
      WHERE q.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    res.status(200).json({ quote: result.rows[0]! });
  },
);

// 4. CREATE QUOTE (Authenticated Users)
export const createQuote = asyncHandler(
  async (
    req: Request<{}, {}, CreateQuoteDTO>,
    res: Response,
  ): Promise<void> => {
    const { quote, author = "Anonymous", tags = [] } = req.body;

    if (!req.user) {
      throw new AppError(
        "Authentication required to submit quotes.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (!quote || typeof quote !== "string" || quote.trim() === "") {
      throw new AppError("Quote content is required.", 400, "INVALID_INPUT");
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const result = await query<Quote>(
      `INSERT INTO quotes (quote, author, tags, submitted_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, quote, author, tags, likes_count, submitted_by, created_at, updated_at`,
      [quote.trim(), author.trim() || "Anonymous", cleanTags, req.user.id],
    );

    res.status(201).json({
      message: "Quote submitted successfully.",
      quote: result.rows[0]!,
    });
  },
);

// 5. UPDATE QUOTE (Owner or Admin)
export const updateQuote = asyncHandler(
  async (
    req: Request<{ id: string }, {}, UpdateQuoteDTO>,
    res: Response,
  ): Promise<void> => {
    const { id } = req.params;
    const { quote, author, tags } = req.body;

    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const existing = await query<Quote>("SELECT * FROM quotes WHERE id = $1", [
      id,
    ]);
    if (existing.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    const currentQuote = existing.rows[0]!;
    const isOwner = currentQuote.submitted_by === req.user.id;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Forbidden: You cannot edit this quote.",
        403,
        "FORBIDDEN",
      );
    }

    const updatedContent =
      quote !== undefined ? quote.trim() : currentQuote.quote;
    const updatedAuthor =
      author !== undefined ? author.trim() : currentQuote.author;
    const updatedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      : currentQuote.tags;

    const result = await query<Quote>(
      `UPDATE quotes
      SET quote = $1, author = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, quote, author, tags, likes_count, submitted_by, created_at, updated_at`,
      [updatedContent, updatedAuthor, updatedTags, id],
    );

    res.status(200).json({
      message: "Quote updated successfully.",
      quote: result.rows[0]!,
    });
  },
);

// 6. DELETE QUOTE (Owner or Admin)
export const deleteQuote = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const existing = await query<Quote>("SELECT * FROM quotes WHERE id = $1", [
      id,
    ]);
    if (existing.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    const currentQuote = existing.rows[0]!;
    const isOwner = currentQuote.submitted_by === req.user.id;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Forbidden: You cannot delete this quote.",
        403,
        "FORBIDDEN",
      );
    }

    await query("DELETE FROM quotes WHERE id = $1", [id]);

    res.status(200).json({ message: "Quote deleted successfully." });
  },
);

// 7. LIKE A QUOTE (Public / Guest / User)
export const likeQuote = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await query<Quote>(
      `UPDATE quotes
      SET likes_count = likes_count + 1
      WHERE id = $1
      RETURNING id, likes_count`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    res.status(200).json({
      message: "Quote liked successfully.",
      likes_count: result.rows[0]!.likes_count,
    });
  },
);

// -------------------------------------------------------------
// COMMENTS
// -------------------------------------------------------------

// GET /api/quotes/:id/comments (Public / Guest)
export const getQuoteComments = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await query<QuoteCommentResponse>(
      `SELECT 
        c.id,
        c.quote_id,
        c.user_id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.name AS user_name
      FROM quote_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.quote_id = $1
      ORDER BY c.created_at ASC`,
      [id],
    );

    res.status(200).json({
      total: result.rows.length,
      comments: result.rows,
    });
  },
);

// POST /api/quotes/:id/comments (Authenticated)
export const addQuoteComment = asyncHandler(
  async (
    req: Request<{ id: string }, {}, CreateCommentDTO>,
    res: Response,
  ): Promise<void> => {
    const { id } = req.params;
    const { comment } = req.body;

    if (!req.user) {
      throw new AppError(
        "Authentication required to post comments.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (!comment || typeof comment !== "string" || comment.trim() === "") {
      throw new AppError("Comment text is required.", 400, "INVALID_INPUT");
    }

    // Verify quote exists
    const quoteExists = await query("SELECT id FROM quotes WHERE id = $1", [
      id,
    ]);
    if (quoteExists.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    const result = await query<QuoteCommentResponse>(
      `INSERT INTO quote_comments (quote_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING id, quote_id, user_id, comment, created_at, updated_at`,
      [id, req.user.id, comment.trim()],
    );

    res.status(201).json({
      message: "Comment added successfully.",
      comment: result.rows[0]!,
    });
  },
);

// DELETE /api/quotes/comments/:commentId (Author or Admin)
export const deleteQuoteComment = asyncHandler(
  async (req: Request<{ commentId: string }>, res: Response): Promise<void> => {
    const { commentId } = req.params;

    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const existing = await query<{ user_id: string }>(
      "SELECT user_id FROM quote_comments WHERE id = $1",
      [commentId],
    );

    if (existing.rows.length === 0) {
      throw new AppError("Comment not found.", 404, "COMMENT_NOT_FOUND");
    }

    const isOwner = existing.rows[0]!.user_id === req.user.id;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(
        "Forbidden: You cannot delete this comment.",
        403,
        "FORBIDDEN",
      );
    }

    await query("DELETE FROM quote_comments WHERE id = $1", [commentId]);

    res.status(200).json({ message: "Comment deleted successfully." });
  },
);

// -------------------------------------------------------------
// SAVE / BOOKMARK
// -------------------------------------------------------------

// POST /api/quotes/:id/save (Toggle Save/Unsave for Authenticated User)
export const toggleSaveQuote = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id: quoteId } = req.params;

    if (!req.user) {
      throw new AppError(
        "Authentication required to save quotes.",
        401,
        "UNAUTHORIZED",
      );
    }

    // Check if already saved
    const existing = await query(
      "SELECT id FROM saved_quotes WHERE user_id = $1 AND quote_id = $2",
      [req.user.id, quoteId],
    );

    if (existing.rows.length > 0) {
      await query(
        "DELETE FROM saved_quotes WHERE user_id = $1 AND quote_id = $2",
        [req.user.id, quoteId],
      );
      res
        .status(200)
        .json({
          message: "Quote removed from saved collection.",
          saved: false,
        });
      return;
    }

    await query(
      "INSERT INTO saved_quotes (user_id, quote_id) VALUES ($1, $2)",
      [req.user.id, quoteId],
    );

    res
      .status(201)
      .json({ message: "Quote saved to collection.", saved: true });
  },
);

// GET /api/quotes/saved (Retrieve User's Saved Quotes)
export const getSavedQuotes = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const result = await query(
      `SELECT 
        q.id,
        q.quote,
        q.author,
        q.tags,
        q.likes_count,
        q.shares_count,
        sq.saved_at
      FROM saved_quotes sq
      INNER JOIN quotes q ON sq.quote_id = q.id
      WHERE sq.user_id = $1
      ORDER BY sq.saved_at DESC`,
      [req.user.id],
    );

    res.status(200).json({
      total: result.rows.length,
      saved_quotes: result.rows,
    });
  },
);

// -------------------------------------------------------------
// SHARE TRACKING
// -------------------------------------------------------------

// POST /api/quotes/:id/share (Public / Guest)
export const trackQuoteShare = asyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await query<{ shares_count: number }>(
      `UPDATE quotes
      SET shares_count = shares_count + 1
      WHERE id = $1
      RETURNING shares_count`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new AppError("Quote not found.", 404, "QUOTE_NOT_FOUND");
    }

    res.status(200).json({
      message: "Share recorded.",
      shares_count: result.rows[0]!.shares_count,
    });
  },
);
