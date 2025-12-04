import { supabase } from './supabase';
import { format, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  review_date: string;
  created_at: string;
  locations: {
    name: string;
  };
  replies: Array<{
    id: string;
    content: string;
    created_at: string;
    is_ai_generated: boolean;
  }> | null;
}

/**
 * 総合レビュー統計を取得
 */
export async function getReviewStatistics(tenantId: string) {
  try {
    // 総レビュー数
    const { count: totalReviews, error: countError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('locations.tenant_id', tenantId);

    if (countError) throw countError;

    // 平均評価
    const { data: avgData, error: avgError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('locations.tenant_id', tenantId);

    if (avgError) throw avgError;

    const avgRating = avgData.length > 0
      ? avgData.reduce((sum, item) => sum + item.rating, 0) / avgData.length
      : 0;

    // 返信率
    const { count: repliedCount, error: repliedError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('locations.tenant_id', tenantId)
      .not('replies', 'is', null);

    if (repliedError) throw repliedError;

    const responseRate = totalReviews ? (repliedCount || 0) / totalReviews * 100 : 0;

    // AI生成返信数
    const { count: aiReplies, error: aiError } = await supabase
      .from('replies')
      .select('replies.id', { count: 'exact', head: true })
      .eq('reviews.locations.tenant_id', tenantId)
      .eq('is_ai_generated', true);

    if (aiError) throw aiError;

    return {
      totalReviews: totalReviews || 0,
      avgRating: parseFloat(avgRating.toFixed(1)),
      responseRate: parseFloat(responseRate.toFixed(1)),
      aiGeneratedReplies: aiReplies || 0,
    };
  } catch (error) {
    console.error('レビュー統計取得エラー:', error);
    throw error;
  }
}

/**
 * 月別レビュー数を取得
 */
export async function getMonthlyReviewCounts(tenantId: string, months = 6) {
  try {
    const now = new Date();
    const result = [];

    for (let i = 0; i < months; i++) {
      const date = subMonths(now, i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'yyyy年M月', { locale: ja });
      
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('locations.tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
      
      if (error) throw error;
      
      result.push({
        month: monthLabel,
        count: count || 0
      });
    }

    return result.reverse();
  } catch (error) {
    console.error('月別レビュー数取得エラー:', error);
    throw error;
  }
}

/**
 * 評価分布を取得
 */
export async function getRatingDistribution(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('locations.tenant_id', tenantId);

    if (error) throw error;

    const distribution = [0, 0, 0, 0, 0]; // 1〜5の評価カウント

    data.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating - 1]++;
      }
    });

    return {
      labels: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'],
      data: distribution
    };
  } catch (error) {
    console.error('評価分布取得エラー:', error);
    throw error;
  }
}

/**
 * 最近のレビューを取得
 */
export async function getRecentReviews(tenantId: string, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        reviewer_name,
        review_date,
        created_at,
        locations(name),
        replies(id, content, created_at, is_ai_generated)
      `)
      .eq('locations.tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as unknown as Review[]).map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewer_name: review.reviewer_name,
      review_date: review.review_date,
      location_name: review.locations ? review.locations.name : '',
      has_reply: review.replies && review.replies.length > 0,
      reply: review.replies && review.replies.length > 0 ? review.replies[0] : null,
    }));
  } catch (error) {
    console.error('最近のレビュー取得エラー:', error);
    throw error;
  }
}

/**
 * ダッシュボードデータをすべて取得
 */
export async function getAllDashboardData(tenantId: string) {
  try {
    const [
      statistics,
      monthlyReviews,
      ratingDistribution,
      recentReviews
    ] = await Promise.all([
      getReviewStatistics(tenantId),
      getMonthlyReviewCounts(tenantId),
      getRatingDistribution(tenantId),
      getRecentReviews(tenantId)
    ]);

    return {
      statistics,
      monthlyReviews,
      ratingDistribution,
      recentReviews
    };
  } catch (error) {
    console.error('ダッシュボードデータ取得エラー:', error);
    throw error;
  }
} 