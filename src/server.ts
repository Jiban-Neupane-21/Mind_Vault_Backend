import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { pool } from "@/config/db";
import { swaggerSpec } from "@/config/swagger";
import authRoutes from "@/routes/authRoutes";
import userRoutes from "@/routes/userRoutes";
import thoughtRoutes from "@/routes/thoughtRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Swagger Docs Route
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Application Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/thoughts", thoughtRoutes);

// Test route (Health check)
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Mind Vault API is live and healthy!",
  });
});

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
