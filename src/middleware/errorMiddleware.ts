import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "@/utils/AppError";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let status = err.status || "error";
  let code = err.code || "INTERNAL_ERROR";

  // Handle unhandled Zod validation errors (if any bypass validateMiddleware)
  if (err instanceof ZodError) {
    statusCode = 400;
    status = "fail";
    code = "VALIDATION_ERROR";
    message = err.issues.map((issue) => issue.message).join(", ");
  }

  // Handle common database / token errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    status = "fail";
    code = "INVALID_TOKEN";
    message = "Invalid authentication token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    status = "fail";
    code = "TOKEN_EXPIRED";
    message = "Authentication token expired. Please log in again.";
  }

  const responseBody: Record<string, any> = {
    status,
    message,
    code,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === "development") {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};