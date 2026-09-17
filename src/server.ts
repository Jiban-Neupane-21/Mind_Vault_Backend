import app from "@/app";
import { pool } from "@/config/db";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL connected successfully to mindvault!");
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