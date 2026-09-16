import { Request, Response } from "express";
import { query } from "@/config/db";
import {
  SiteCategory,
  UsefulSite,
  SiteResponse,
  CreateSiteDTO,
  UpdateSiteDTO,
  CreateCategoryDTO,
  SiteQueryParams,
  PaginatedSitesResponse,
} from "@/types/site";

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------

export const getCategories = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await query<SiteCategory>(
      `SELECT id, name, description, created_at 
       FROM site_categories 
       ORDER BY name ASC`,
    );

    res.status(200).json({
      total: result.rows.length,
      categories: result.rows,
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

export const createCategory = async (
  req: Request<{}, {}, CreateCategoryDTO>,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Category name is required." });
      return;
    }

    const result = await query<SiteCategory>(
      `INSERT INTO site_categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name.trim(), description ? description.trim() : null],
    );

    res.status(201).json({
      message: "Category created successfully.",
      category: result.rows[0],
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

// -------------------------------------------------------------
// USEFUL SITES
// -------------------------------------------------------------


export const getSites = async (
  req: Request<{}, {}, {}, SiteQueryParams>,
  res: Response,
): Promise<void> => {
  try {
    const { category_id, search, page = "1", limit = "10" } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNumber - 1) * limitNumber;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 1. Filter by category
    if (category_id) {
      conditions.push(`s.category_id = $${paramIndex++}`);
      values.push(category_id);
    }

    // 2. Case-insensitive search on title and description
    if (search && search.trim() !== "") {
      conditions.push(
        `(s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`,
      );
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query 1: Total count for pagination metadata
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(s.id) as count 
       FROM useful_sites s
       ${whereClause}`,
      values,
    );

    const total = parseInt(countResult.rows[0]?.count || "0", 10);
    const total_pages = Math.ceil(total / limitNumber);

    // Query 2: Paginated data rows
    const dataValues = [...values, limitNumber, offset];
    const dataResult = await query<SiteResponse>(
      `SELECT 
        s.id,
        s.category_id,
        s.title,
        s.url,
        s.description,
        s.created_by,
        s.created_at,
        s.updated_at,
        c.name AS category_name,
        u.name AS creator_name
      FROM useful_sites s
      LEFT JOIN site_categories c ON s.category_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataValues,
    );

    const response: PaginatedSitesResponse = {
      total,
      page: pageNumber,
      limit: limitNumber,
      total_pages,
      sites: dataResult.rows,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

export const getSiteById = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query<SiteResponse>(
      `SELECT 
        s.id,
        s.category_id,
        s.title,
        s.url,
        s.description,
        s.created_by,
        s.created_at,
        s.updated_at,
        c.name AS category_name,
        u.name AS creator_name
      FROM useful_sites s
      LEFT JOIN site_categories c ON s.category_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Site not found." });
      return;
    }

    res.status(200).json({ site: result.rows[0]! });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

export const createSite = async (
  req: Request<{}, {}, CreateSiteDTO>,
  res: Response,
): Promise<void> => {
  try {
    const { category_id, title, url, description } = req.body;

    if (!req.user) {
      res
        .status(401)
        .json({ error: "Authentication required to submit sites." });
      return;
    }

    if (!title || typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "Site title is required." });
      return;
    }

    if (!url || typeof url !== "string" || url.trim() === "") {
      res.status(400).json({ error: "Site URL is required." });
      return;
    }

    const result = await query<UsefulSite>(
      `INSERT INTO useful_sites (category_id, title, url, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category_id, title, url, description, created_by, created_at, updated_at`,
      [
        category_id || null,
        title.trim(),
        url.trim(),
        description ? description.trim() : null,
        req.user.id,
      ],
    );

    res.status(201).json({
      message: "Site added successfully.",
      site: result.rows[0]!,
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

export const updateSite = async (
  req: Request<{ id: string }, {}, UpdateSiteDTO>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { category_id, title, url, description } = req.body;

    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const existing = await query<UsefulSite>(
      `SELECT * FROM useful_sites WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Site not found." });
      return;
    }

    const site = existing.rows[0]!;

    const isOwner = site.created_by === req.user.id;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Forbidden: You cannot edit this site." });
      return;
    }

    const updatedTitle = title !== undefined ? title.trim() : site.title;
    const updatedUrl = url !== undefined ? url.trim() : site.url;
    const updatedDescription =
      description !== undefined ? description.trim() : site.description;
    const updatedCategory =
      category_id !== undefined ? category_id : site.category_id;

    const result = await query<UsefulSite>(
      `UPDATE useful_sites
       SET category_id = $1, title = $2, url = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, category_id, title, url, description, created_by, created_at, updated_at`,
      [updatedCategory, updatedTitle, updatedUrl, updatedDescription, id],
    );

    res.status(200).json({
      message: "Site updated successfully.",
      site: result.rows[0]!,
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};

export const deleteSite = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const existing = await query<UsefulSite>(
      `SELECT * FROM useful_sites WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Site not found." });
      return;
    }

    const site = existing.rows[0]!;

    const isOwner = site.created_by === req.user.id;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this site." });
      return;
    }

    await query(`DELETE FROM useful_sites WHERE id = $1`, [id]);

    res.status(200).json({ message: "Site deleted successfully." });
  } catch (error: unknown) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Internal error.",
      });
  }
};
