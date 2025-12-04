import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Supabaseクライアントを使用してメトリクスを取得
    const { data: metrics, error } = await supabase
      .from('usage_metrics')
      .select('type')
      .eq('tenant_id', userId)
      .gte('period_start', startOfMonth.toISOString())
      .lte('period_end', endOfMonth.toISOString());

    if (error) {
      logger.error('使用量メトリクスの取得に失敗しました', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }

    // タイプごとに集計
    const aggregatedMetrics = metrics?.reduce((acc: any, metric: any) => {
      const type = metric.type;
      if (!acc[type]) {
        acc[type] = { type, total: 0 };
      }
      acc[type].total += metric.count || 0;
      return acc;
    }, {});

    const result = aggregatedMetrics ? Object.values(aggregatedMetrics) : [];

    res.status(200).json(result);
  } catch (error) {
    logger.error('使用量メトリクスの取得に失敗しました', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
} 