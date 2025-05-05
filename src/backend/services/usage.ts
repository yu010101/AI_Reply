import { db } from '../db';
import { PLAN_LIMITS, Plan } from '../../constants/plan';

export class UsageService {
  static async trackUsage(tenantId: string, type: 'review' | 'ai_reply') {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    await db.query(
      `INSERT INTO usage_metrics (tenant_id, type, count, period_start, period_end)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (tenant_id, type, period_start)
       DO UPDATE SET count = usage_metrics.count + 1`,
      [tenantId, type, startOfMonth, endOfMonth]
    );
  }

  static async checkUsageLimit(tenantId: string, type: 'review' | 'ai_reply'): Promise<boolean> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // テナントのプランを取得
    const subscription = await db.query(
      'SELECT plan FROM subscriptions WHERE tenant_id = $1',
      [tenantId]
    );

    if (!subscription.rows[0]) {
      throw new Error('サブスクリプションが見つかりません');
    }

    const plan = subscription.rows[0].plan as Plan;
    const limit = type === 'review' 
      ? PLAN_LIMITS[plan].maxReviewsPerMonth 
      : PLAN_LIMITS[plan].maxAIRepliesPerMonth;

    // 現在の使用量を取得
    const usage = await db.query(
      `SELECT SUM(count) as total
       FROM usage_metrics
       WHERE tenant_id = $1
       AND type = $2
       AND period_start = $3
       AND period_end = $4`,
      [tenantId, type, startOfMonth, endOfMonth]
    );

    const currentUsage = parseInt(usage.rows[0]?.total || '0');
    return currentUsage < limit;
  }

  static async getUsageMetrics(tenantId: string) {
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
      [tenantId, startOfMonth, endOfMonth]
    );

    return metrics.rows;
  }
} 