import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '@/utils/token';

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  // Guard against "Bearer " with no token following it
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token) as TokenPayload;
    req.user = decoded;
  } catch {
    // Invalid or expired token: treat as guest rather than failing
    req.user = undefined;
  }

  next();
};