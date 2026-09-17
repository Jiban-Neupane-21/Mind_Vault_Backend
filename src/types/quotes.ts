export interface Quote {
  id: string;
  quote: string;
  author: string;
  submitted_by: string | null;
  tags: string[];
  likes_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface QuoteResponse extends Quote {
  submitter_name?: string | null;
}

export interface CreateQuoteDTO {
  quote: string;
  author?: string;
  tags?: string[];
}

export interface UpdateQuoteDTO {
  quote?: string;
  author?: string;
  tags?: string[];
}

export interface QuoteComment {
  id: string;
  quote_id: string;
  user_id: string | null;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

export interface QuoteCommentResponse extends QuoteComment {
  user_name?: string | null;
}

export interface CreateCommentDTO {
  comment: string;
}

export interface SavedQuote {
  id: string;
  user_id: string;
  quote_id: string;
  saved_at: Date;
}

export interface QuoteQueryParams {
  search?: string;
  tag?: string;
  author?: string;
  page?: string;
  limit?: string;
}

export interface PaginatedQuotesResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  quotes: QuoteResponse[];
}