import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { PLAN_LIMITS } from '@/constants/plan';
import { Plan } from '@/constants/plan';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return getUserMetrics(req, res);
  } else if (req.method === 'POST') {
    return recordUsage(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// テナントの使用量メトリクスを取得
async function getUserMetrics(req: NextApiRequest, res: NextApiResponse) {
  try {
    // セッションからユーザー情報を取得
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const tenantId = authSession.user.id;
    const { metric, month, year } = req.query;

    // クエリを構築
    let query = supabase
      .from('usage_metrics')
      .select('*')
      .eq('tenant_id', tenantId);

    // メトリクス名でフィルタリング
    if (metric) {
      query = query.eq('metric_name', metric);
    }

    // 月でフィルタリング
    if (month) {
      query = query.eq('month', month);
    }

    // 年でフィルタリング
    if (year) {
      query = query.eq('year', year);
    }

    // データを取得
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: '使用量メトリクスの取得に失敗しました' });
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error('使用量メトリクス取得エラー', { error });
    return res.status(500).json({ error: '使用量メトリクスの取得に失敗しました' });
  }
}

// 使用量を記録
async function recordUsage(req: NextApiRequest, res: NextApiResponse) {
  try {
    // セッションからユーザー情報を取得
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const tenantId = authSession.user.id;
    const { metric_name, count = 1 } = req.body;

    if (!metric_name) {
      return res.status(400).json({ error: 'メトリクス名が必要です' });
    }

    // 現在の月と年を取得
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
    const year = now.getFullYear();

    // 既存のメトリクスを検索
    const { data: existingMetric, error: fetchError } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('metric_name', metric_name)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: 結果が見つからない
      return res.status(400).json({ error: '使用量メトリクスの検索に失敗しました' });
    }

    // テナントのプラン情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      return res.status(400).json({ error: 'テナント情報の取得に失敗しました' });
    }

    // 使用量制限のチェック
    const planLimits = PLAN_LIMITS[tenant.plan as Plan || 'free'];
    
    let maxAllowed = 0;
    if (metric_name === 'location') {
      maxAllowed = planLimits.maxLocations;
    } else if (metric_name === 'review') {
      maxAllowed = planLimits.maxReviewsPerMonth;
    } else if (metric_name === 'ai_reply') {
      maxAllowed = planLimits.maxAIRepliesPerMonth;
    }

    // 制限を超えるかチェック
    const currentCount = existingMetric ? existingMetric.count : 0;
    const newCount = currentCount + count;

    if (maxAllowed > 0 && newCount > maxAllowed) {
      return res.status(403).json({ 
        error: '使用量制限を超えています',
        limitExceeded: true,
        currentUsage: currentCount,
        limit: maxAllowed
      });
    }

    let result;
    if (existingMetric) {
      // 既存のメトリクスを更新
      const { data, error } = await supabase
        .from('usage_metrics')
        .update({
          count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMetric.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: '使用量メトリクスの更新に失敗しました' });
      }
      
      result = data;
    } else {
      // 新しいメトリクスを作成
      const { data, error } = await supabase
        .from('usage_metrics')
        .insert({
          tenant_id: tenantId,
          metric_name,
          count,
          month,
          year,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: '使用量メトリクスの作成に失敗しました' });
      }
      
      result = data;
    }

    return res.status(200).json({
      success: true,
      data: result,
      currentUsage: newCount,
      limit: maxAllowed
    });
  } catch (error) {
    logger.error('使用量記録エラー', { error });
    return res.status(500).json({ error: '使用量の記録に失敗しました' });
  }
} 