import { Request, Response } from 'express';
import { query } from '@/config/db';

export const getVisitorStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM visitors) AS total_visitors,
        (SELECT COUNT(*) FROM visitors WHERE visit_count = 1) AS new_visitors,
        (SELECT COUNT(*) FROM visitors WHERE visit_count > 1) AS repeat_visitors,
        (SELECT COUNT(DISTINCT visitor_id) FROM visitor_logs WHERE visited_at >= CURRENT_DATE) AS active_today
    `;

    const result = await query(statsQuery);
    const data = result.rows[0];

    res.status(200).json({
      totalVisitors: Number(data?.total_visitors || 0),
      newVisitors: Number(data?.new_visitors || 0),
      repeatVisitors: Number(data?.repeat_visitors || 0),
      activeToday: Number(data?.active_today || 0),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
};