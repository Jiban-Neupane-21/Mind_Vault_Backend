import { Pool, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Enable SSL when connecting to hosted providers like Supabase
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("supabase.co")||
  process.env.DATABASE_URL?.includes("pooler.supabase.com");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? {
        rejectUnauthorized: false, // Required for Supabase connection pooler
      }
    : false,
    max: 10, // Maintain up to 10 active connections
  idleTimeoutMillis: 60000, // Keep connections alive for 60 seconds before releasing
  connectionTimeoutMillis: 10000, // Timeout fast if unreachable
  keepAlive: true, // Prevent intermediate routers/proxies from dropping TCP connection
});

// Catch idle client errors so the server doesn't crash silently
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

// Warm up a connection immediately when the server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error("Failed to establish initial PostgreSQL connection:", err.message);
  } else {
    console.log(" PostgreSQL connection pool initialized and warmed up.");
    release();
  }
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
