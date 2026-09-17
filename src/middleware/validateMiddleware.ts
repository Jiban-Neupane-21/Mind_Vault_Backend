import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

interface RequestValidationSchema {
  body?: ZodObject;
  query?: ZodObject;
  params?: ZodObject;
}

export const validate = (schema: RequestValidationSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schema.params) {
        const parsedParams = await schema.params.parseAsync(req.params);
        Object.defineProperty(req, "params", {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: "fail",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
