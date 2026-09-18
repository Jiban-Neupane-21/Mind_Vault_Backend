import app from "@/app";
import { pool } from "@/config/db";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const client = await pool.connect();
    // Execute a quick ping query to verify database name and time
    const res = await client.query("SELECT current_database(), NOW()");
    console.log(
      `PostgreSQL connected successfully to [${res.rows[0].current_database}] at: ${res.rows[0].now}`,
    );
    client.release();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(
        `Swagger docs available at http://localhost:${PORT}/api/docs`,
      );
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Database connection failed:", error.message);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    process.exit(1);
  }
}

startServer();
