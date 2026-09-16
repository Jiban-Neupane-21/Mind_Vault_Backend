export interface SiteCategory {
  id: string;
  name: string;
  description?: string | null;
  created_at: Date;
}

export interface UsefulSite {
  id: string;
  category_id: string | null;
  title: string;
  url: string;
  description?: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SiteResponse extends UsefulSite {
  category_name?: string | null;
  creator_name?: string | null;
}

export interface CreateSiteDTO {
  category_id?: string | null;
  title: string;
  url: string;
  description?: string;
}

export interface UpdateSiteDTO {
  category_id?: string | null;
  title?: string;
  url?: string;
  description?: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface SiteQueryParams {
  category_id?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface PaginatedSitesResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  sites: SiteResponse[];
}