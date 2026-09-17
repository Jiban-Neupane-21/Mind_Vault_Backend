import rateLimit from "express-rate-limit";

// 1. General Limiter (Applied globally or across general public routes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return standard RateLimit headers (draft-6 / draft-7)
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// 2. Auth Limiter (Strict limits to combat brute-force attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// 3. Engagement & Public Mutation Limiter (Share counts, likes, random pulls)
export const engagementLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 actions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many engagement actions performed. Please slow down.",
  },
});