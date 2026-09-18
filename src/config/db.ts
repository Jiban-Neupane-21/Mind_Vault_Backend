import { Pool, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Enable SSL when connecting to hosted providers like Supabase
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("supabase.co");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? {
        rejectUnauthorized: false, // Required for Supabase connection pooler
      }
    : false,
});

// Catch idle client errors so the server doesn't crash silently
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
