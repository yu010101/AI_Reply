import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session?.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const metrics = await db.query(
      `SELECT type, SUM(count) as total
       FROM usage_metrics
       WHERE tenant_id = $1
       AND period_start = $2
       AND period_end = $3
       GROUP BY type`,
      [session.user.tenantId, startOfMonth, endOfMonth]
    );

    res.status(200).json(metrics.rows);
  } catch (error) {
    console.error('使用量メトリクスの取得に失敗しました:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 