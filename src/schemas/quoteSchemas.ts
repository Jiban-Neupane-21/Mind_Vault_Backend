import { z } from "zod";

export const createQuoteSchema = z.object({
  quote: z.string().trim().min(5, "Quote must be at least 5 characters"),
  author: z.string().trim().max(150).optional().default("Anonymous"),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const updateQuoteSchema = z.object({
  quote: z.string().trim().min(5, "Quote must be at least 5 characters").optional(),
  author: z.string().trim().max(150).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export const createCommentSchema = z.object({
  comment: z.string().trim().min(1, "Comment text cannot be empty").max(1000, "Comment must not exceed 1000 characters"),
});

export const quoteQuerySchema = z.object({
  search: z.string().trim().optional(),
  author: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  page: z.string().regex(/^\d+$/, "Page must be a numeric string").optional(),
  limit: z.string().regex(/^\d+$/, "Limit must be a numeric string").optional(),
});

export const quoteParamSchema = z.object({
  id: z.string().uuid("Invalid quote UUID format"),
});

export const commentParamSchema = z.object({
  commentId: z.string().uuid("Invalid comment UUID format"),
});