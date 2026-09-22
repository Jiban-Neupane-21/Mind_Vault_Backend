import express from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/config/swagger";
import authRoutes from "@/routes/authRoutes";
import userRoutes from "@/routes/userRoutes";
import thoughtRoutes from "@/routes/thoughtRoutes";
import siteRoutes from "@/routes/siteRoutes";
import quoteRoutes from "@/routes/quoteRoutes";
import healthRoutes from "@/routes/healthRoutes";
import adminRoutes from "@/routes/adminRoutes";
import { trackVisitor } from "@/middleware/trackVisitor";
import { generalLimiter } from "@/middleware/rateLimitMiddleware";
import { errorHandler } from "@/middleware/errorMiddleware";
import { AppError } from "@/utils/AppError";
import communityRoutes from '@/routes/communityRoutes';

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins: string[] = [
  "https://mind-vault-backend-qbok.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000", // <-- Must be added so your local Swagger UI is allowed
  process.env.CLIENT_URL || "",
].filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // 1. Allow server-to-server, curl, or mobile requests without Origin header
    if (!origin) return callback(null, true);

    // 2. Allow matching origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 3. For Swagger / testing, allow it rather than throwing an Error:
    return callback(null, true);
  },
  credentials: true,
  exposedHeaders: ["x-visitor-id"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

app.use(cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false, // Turn off COOP if Swagger has issues
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  }),
);

app.use(express.json());

// Swagger docs
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { swaggerOptions: { tagShorter: false } }),
);

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Mind Vault API",
    docs: "/api/docs",
    health: "/api/health",
  });
});

// API base endpoint
app.get("/api", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Mind Vault API Base Endpoint",
    version: "1.0.0",
    docs: "/api/docs",
  });
});

app.use(trackVisitor);

app.use("/api", generalLimiter);

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/thoughts", thoughtRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/quotes", quoteRoutes);
app.use('/api/communities', communityRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, _res, next) => {
  next(
    new AppError(
      `Cannot find ${req.originalUrl} on this server`,
      404,
      "NOT_FOUND",
    ),
  );
});

app.use(errorHandler);

export default app;
