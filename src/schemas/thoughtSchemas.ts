import { z } from "zod";

export const createThoughtSchema = z.object({
  content: z.string().trim().min(1, "Thought content cannot be empty").max(2000, "Content must not exceed 2000 characters"),
  is_public: z.boolean().optional().default(true),
});

export const updateThoughtSchema = z.object({
  content: z.string().trim().min(1, "Thought content cannot be empty").max(2000, "Content must not exceed 2000 characters").optional(),
  is_public: z.boolean().optional(),
  edit_token: z.string().trim().min(1, "Edit token cannot be empty").optional(),
});

export const thoughtParamSchema = z.object({
  id: z.string().uuid("Invalid thought UUID format"),
});