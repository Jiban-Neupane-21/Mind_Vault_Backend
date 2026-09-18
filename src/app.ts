import express from "express";
import helmet from "helmet";
import cors, {CorsOptions} from "cors";
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

// 1. Trust first proxy (Render, Railway, Fly.io, Nginx)
// Needed for accurate IP resolution in trackVisitor and generalLimiter
app.set("trust proxy", 1);

// 2. Production CORS configuration
const allowedOrigins: string[] = [
  process.env.CLIENT_URL || "", // e.g., https://your-mindvault-frontend.vercel.app
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls, Postman, or requests without origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  exposedHeaders: ["x-visitor-id"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// 3. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Preserves Swagger UI styling & scripts
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);

app.use(express.json());

// Attach visitor tracking
app.use(trackVisitor);

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
