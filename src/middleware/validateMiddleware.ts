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
        req.query = (await schema.query.parseAsync(
          req.query,
        )) as unknown as Request["query"];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(
          req.params,
        )) as unknown as Request["params"];
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
