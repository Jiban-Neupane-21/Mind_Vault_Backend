import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(100),
  description: z.string().trim().max(300).optional(),
});

export const createSiteSchema = z.object({
  category_id: z.string().uuid("Invalid category UUID format").optional().nullable(),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  url: z.string().trim().url("Must be a valid URL (include http:// or https://)"),
  description: z.string().trim().max(500).optional(),
});

export const updateSiteSchema = createSiteSchema.partial();

export const siteQuerySchema = z.object({
  category_id: z.string().uuid("Invalid category UUID format").optional(),
  search: z.string().trim().optional(),
  page: z.string().regex(/^\d+$/, "Page must be a numeric string").optional(),
  limit: z.string().regex(/^\d+$/, "Limit must be a numeric string").optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});