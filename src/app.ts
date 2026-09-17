import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger";
import authRoutes from "@/routes/authRoutes";
import userRoutes from "@/routes/userRoutes";
import thoughtRoutes from "@/routes/thoughtRoutes";
import siteRoutes from "@/routes/siteRoutes";
import quoteRoutes from "@/routes/quoteRoutes";
import healthRoutes from "@/routes/healthRoutes";
import adminRoutes from '@/routes/adminRoutes';
import { trackVisitor } from "@/middleware/trackVisitor";
import { generalLimiter } from "@/middleware/rateLimitMiddleware";
import { errorHandler } from "@/middleware/errorMiddleware";
import { AppError } from "@/utils/AppError";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    exposedHeaders: ["x-visitor-id"],
  }),
);

// Attach visitor tracking
app.use(trackVisitor);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Avoid breaking Swagger UI styles
  }),
);

// General limiter on API routes
app.use("/api", generalLimiter);

// Swagger documentation route
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { swaggerOptions: { tagShorter: false } }),
);

// Application routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/thoughts", thoughtRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/quotes", quoteRoutes);
app.use('/api/admin', adminRoutes);
// Catch-all 404 handler for unmapped routes
app.use((req, _res, next) => {
  next(
    new AppError(
      `Cannot find ${req.originalUrl} on this server`,
      404,
      "NOT_FOUND",
    ),
  );
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
