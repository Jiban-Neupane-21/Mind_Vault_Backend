import { Request, Response } from 'express';
import { query } from '@/config/db';

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'unhealthy';
  }

  const overallStatus = dbStatus === 'healthy' ? 'healthy' : 'degraded';
  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatus,
      latency: dbLatencyMs !== null ? `${dbLatencyMs}ms` : null,
    },
    responseTime: `${Date.now() - startTime}ms`,
  });
};