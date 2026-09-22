import {PostType, PostMetadata,  CreateCommunityDTO, CreatePostDTO,  ValidationResult } from '@/types/community';


/**
 * Converts a string to a clean URL-friendly slug.
 * Example: "Web Dev & Design!" -> "web-dev-design"
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Validates payload for creating a community
 */
export const validateCommunityInput = (data: CreateCommunityDTO): ValidationResult => {
  const { name, description } = data;

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return { valid: false, message: 'Community name must be at least 3 characters long.' };
  }

  if (name.trim().length > 80) {
    return { valid: false, message: 'Community name cannot exceed 80 characters.' };
  }

  if (description && description.length > 500) {
    return { valid: false, message: 'Description cannot exceed 500 characters.' };
  }

  return { valid: true };
};

/**
 * Validates payload for polymorphic posts (thought, quote, site)
 */
export const validatePostInput = (data: CreatePostDTO): ValidationResult => {
  const { post_type, title, content, metadata = {} } = data;
  const allowedTypes: PostType[] = ['thought', 'quote', 'site'];

  if (!allowedTypes.includes(post_type)) {
    return {
      valid: false,
      message: `Invalid post type. Must be one of: ${allowedTypes.join(', ')}`
    };
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, message: 'Title is required.' };
  }

  if (title.trim().length > 255) {
    return { valid: false, message: 'Title cannot exceed 255 characters.' };
  }

  if (post_type === 'site') {
    if (!metadata.url) {
      return { valid: false, message: 'A valid URL is required in metadata.url for site posts.' };
    }
    try {
      new URL(metadata.url);
    } catch {
      return { valid: false, message: 'The provided metadata.url is not a valid URL.' };
    }
  }

  if (post_type === 'quote') {
    if (!content || content.trim().length === 0) {
      return { valid: false, message: 'Content (the quote text) is required for quotes.' };
    }
    if (!metadata.author || typeof metadata.author !== 'string' || metadata.author.trim().length === 0) {
      return { valid: false, message: 'Author name is required in metadata.author for quotes.' };
    }
  }

  if (post_type === 'thought') {
    if (!content || content.trim().length === 0) {
      return { valid: false, message: 'Content is required for thought posts.' };
    }
  }

  return { valid: true };
};