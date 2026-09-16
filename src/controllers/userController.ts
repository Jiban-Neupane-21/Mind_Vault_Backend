import { Request, Response } from 'express';
import { query } from '@/config/db';
import { SafeUser } from '@/types/user';

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'User is not authenticated.' });
    return;
  }

  try {
    const result = await query<SafeUser>(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({ user });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
};