import { NextApiRequest, NextApiResponse } from 'next';
import { getHealthStatus } from '@/utils/performanceMonitoring';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthStatus = await getHealthStatus();

    if (healthStatus.status === 'healthy') {
      return res.status(200).json(healthStatus);
    } else {
      logger.warn('ヘルスチェック失敗', { healthStatus });
      return res.status(503).json(healthStatus);
    }
  } catch (error) {
    logger.error('ヘルスチェックエラー', { error });
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
}
