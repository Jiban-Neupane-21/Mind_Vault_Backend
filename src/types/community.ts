export type PostType = 'thought' | 'quote' | 'site';

// If defined like this:
export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Moderator = 'moderator',
}

export interface CreateCommunityDTO {
  name: string;
  description?: string;
  icon_url?: string;
}

export interface PostMetadata {
  url?: string;
  favicon?: string;
  author?: string;
  source?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface CreatePostDTO {
  post_type: PostType;
  title: string;
  content?: string;
  metadata?: PostMetadata;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface UpdateCommunityDTO {
  name?: string;
  description?: string;
  icon_url?: string | null;
}