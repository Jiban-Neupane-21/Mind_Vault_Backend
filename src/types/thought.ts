export interface Thought {
  id: string;
  user_id: string | null;
  content: string;
  is_public: boolean;
  is_anonymous: boolean;
  edit_token_hash?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ThoughtResponse {
  id: string;
  content: string;
  is_public: boolean;
  is_anonymous: boolean;
  author_name?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateThoughtDTO {
  content: string;
  is_public?: boolean;
  is_anonymous?: boolean;
}

export interface UpdateThoughtDTO {
  content?: string;
  is_public?: boolean;
  is_anonymous?: boolean;
}