import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '@/utils/token';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    res.status(401).json({ error: 'Invalid authentication configuration.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error: unknown) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};