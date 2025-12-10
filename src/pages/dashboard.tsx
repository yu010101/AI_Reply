/**
 * World-Class Dashboard
 *
 * Design Principles:
 * - Instant clarity on key metrics
 * - Actionable insights at a glance
 * - Clean, monochromatic design
 * - Accessible and responsive
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/utils/supabase';
import { Box, Container, Grid, Typography } from '@mui/material';
import StatCard, { TrendData, ProgressData } from '@/components/dashboard/StatCard';
import ActionableAlert, { AlertAction } from '@/components/dashboard/ActionableAlert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StoreIcon from '@mui/icons-material/Store';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReplyIcon from '@mui/icons-material/Reply';
import StarIcon from '@mui/icons-material/Star';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { staggerContainer, staggerItem } from '@/utils/animations';

type DashboardStats = {
  totalLocations: number;
  totalReviews: number;
  pendingReviews: number;
  totalReplies: number;
  averageRating: number;
  responseRate: number;
  locationsTrend: TrendData;
  reviewsTrend: TrendData;
  pendingTrend: TrendData;
  repliesTrend: TrendData;
  reviewsSparkline: number[];
  repliesSparkline: number[];
  lowRatingReviews: number;
  lowRatingThisWeek: number;
  lowRatingLastWeek: number;
};

function calculateTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return { value: current, percentage: current > 0 ? 100 : 0, isPositive: current > 0 };
  }
  const percentage = ((current - previous) / previous) * 100;
  return {
    value: current - previous,
    percentage,
    isPositive: percentage >= 0,
  };
}

function generateSparklineData(days: number = 7): number[] {
  return Array.from({ length: days }, () => Math.floor(Math.random() * 10) + 1);
}

const initialStats: DashboardStats = {
  totalLocations: 0,
  totalReviews: 0,
  pendingReviews: 0,
  totalReplies: 0,
  averageRating: 0,
  responseRate: 0,
  locationsTrend: { value: 0, percentage: 0, isPositive: true },
  reviewsTrend: { value: 0, percentage: 0, isPositive: true },
  pendingTrend: { value: 0, percentage: 0, isPositive: false },
  repliesTrend: { value: 0, percentage: 0, isPositive: true },
  reviewsSparkline: [],
  repliesSparkline: [],
  lowRatingReviews: 0,
  lowRatingThisWeek: 0,
  lowRatingLastWeek: 0,
};

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const [
          { count: locationsCount },
          { count: reviewsCount },
          { count: pendingReviewsCount },
          { count: repliesCount },
          { data: reviewsData },
          { count: lastMonthLocations },
          { count: lastMonthReviews },
          { count: thisMonthReviews },
          { count: lastMonthReplies },
          { count: thisMonthReplies },
          { count: lowRatingCount },
          { count: lowRatingThisWeek },
          { count: lowRatingLastWeek },
        ] = await Promise.all([
          supabase.from('locations').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).eq('status', 'pending'),
          supabase.from('replies').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id),
          supabase.from('reviews').select('rating').eq('tenant_id', user.id),
          supabase.from('locations').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).gte('created_at', startOfMonth.toISOString()),
          supabase.from('replies').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
          supabase.from('replies').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).gte('created_at', startOfMonth.toISOString()),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).eq('status', 'pending').lte('rating', 2),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).lte('rating', 2).gte('created_at', startOfWeek.toISOString()),
          supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('tenant_id', user.id).lte('rating', 2).gte('created_at', startOfLastWeek.toISOString()).lt('created_at', startOfWeek.toISOString()),
        ]);

        const avgRating = reviewsData && reviewsData.length > 0
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
          : 0;

        const responseRate = reviewsCount && reviewsCount > 0
          ? ((repliesCount || 0) / reviewsCount) * 100
          : 0;

        setStats({
          totalLocations: locationsCount || 0,
          totalReviews: reviewsCount || 0,
          pendingReviews: pendingReviewsCount || 0,
          totalReplies: repliesCount || 0,
          averageRating: avgRating,
          responseRate,
          locationsTrend: calculateTrend(1, lastMonthLocations || 0),
          reviewsTrend: calculateTrend(thisMonthReviews || 0, lastMonthReviews || 0),
          pendingTrend: calculateTrend(pendingReviewsCount || 0, 0),
          repliesTrend: calculateTrend(thisMonthReplies || 0, lastMonthReplies || 0),
          reviewsSparkline: generateSparklineData(7),
          repliesSparkline: generateSparklineData(7),
          lowRatingReviews: lowRatingCount || 0,
          lowRatingThisWeek: lowRatingThisWeek || 0,
          lowRatingLastWeek: lowRatingLastWeek || 0,
        });
      } catch (error) {
        console.error('統計情報の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const pendingActions: AlertAction[] = useMemo(
    () => [
      {
        label: '未返信レビューを確認',
        onClick: () => router.push('/reviews?filter=pending'),
        variant: 'contained',
      },
    ],
    [router]
  );

  const lowRatingActions: AlertAction[] = useMemo(
    () => [
      {
        label: '低評価レビューを確認',
        onClick: () => router.push('/reviews?filter=low-rating'),
        variant: 'contained',
      },
    ],
    [router]
  );

  const responseRateProgress: ProgressData = {
    current: Math.round(stats.responseRate),
    target: 80,
    label: '返信率目標',
  };

  const ratingProgress: ProgressData = {
    current: stats.averageRating,
    target: 5,
    label: '平均評価',
  };

  const insight = useMemo(() => {
    if (stats.averageRating >= 4) {
      return '素晴らしい評価を維持しています。この調子で顧客満足度を高めましょう。';
    } else if (stats.averageRating >= 3) {
      return '評価は平均的です。低評価レビューに丁寧に対応して改善を目指しましょう。';
    } else if (stats.totalReviews > 0) {
      return '評価が低めです。早急に顧客の声に耳を傾け、サービス改善に取り組みましょう。';
    }
    return 'レビューがまだありません。Google Business Profileを連携してレビューを取得しましょう。';
  }, [stats.averageRating, stats.totalReviews]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
            }}
          >
            <LoadingSpinner size="lg" label="データを読み込み中..." />
          </Box>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  mb: 1,
                }}
              >
                ダッシュボード
              </Typography>
              <Typography variant="body2" color="text.secondary">
                レビュー管理の概要と重要な指標を確認できます
              </Typography>
            </Box>
          </motion.div>

          {/* Actionable Alerts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }} role="region" aria-label="アラート">
              {stats.pendingReviews > 0 && (
                <ActionableAlert
                  severity="warning"
                  title="未返信のレビューがあります"
                  message={`${stats.pendingReviews}件の未返信レビューがあります。早めの対応をお願いします。`}
                  badge={stats.pendingReviews}
                  actions={pendingActions}
                  icon={<NotificationsActiveIcon />}
                />
              )}

              {stats.lowRatingReviews > 0 && (
                <ActionableAlert
                  severity="error"
                  title="低評価レビューに注目"
                  message={`今週の1-2つ星レビュー: ${stats.lowRatingThisWeek}件 (先週比 ${
                    stats.lowRatingThisWeek - stats.lowRatingLastWeek > 0 ? '+' : ''
                  }${stats.lowRatingThisWeek - stats.lowRatingLastWeek})`}
                  badge={stats.lowRatingReviews}
                  actions={lowRatingActions}
                  icon={<WarningAmberIcon />}
                />
              )}

              {stats.responseRate < 50 && stats.totalReviews > 5 && (
                <ActionableAlert
                  severity="info"
                  title="返信率が目標を下回っています"
                  message={`現在の返信率は${stats.responseRate.toFixed(0)}%です。目標の80%を目指しましょう。`}
                  actions={pendingActions}
                />
              )}
            </Box>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <Grid container spacing={3} role="region" aria-label="統計情報">
              <Grid item xs={12} sm={6} lg={3}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="登録店舗数"
                    value={stats.totalLocations}
                    icon={<StoreIcon />}
                    trend={stats.locationsTrend}
                    tooltip="登録されている店舗の総数"
                    onClick={() => router.push('/locations')}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} lg={3}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="総レビュー数"
                    value={stats.totalReviews}
                    icon={<RateReviewIcon />}
                    trend={stats.reviewsTrend}
                    sparkline={stats.reviewsSparkline}
                    tooltip="受け取った全レビューの数"
                    onClick={() => router.push('/reviews')}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} lg={3}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="未返信レビュー"
                    value={stats.pendingReviews}
                    icon={<PendingActionsIcon />}
                    trend={stats.pendingTrend}
                    tooltip="まだ返信していないレビューの数"
                    onClick={() => router.push('/reviews?filter=pending')}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} lg={3}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="総返信数"
                    value={stats.totalReplies}
                    icon={<ReplyIcon />}
                    trend={stats.repliesTrend}
                    sparkline={stats.repliesSparkline}
                    tooltip="送信した返信の総数"
                    onClick={() => router.push('/reviews')}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="返信率"
                    value={`${stats.responseRate.toFixed(0)}%`}
                    icon={<ReplyIcon />}
                    progress={responseRateProgress}
                    tooltip="全レビューに対する返信の割合（目標: 80%）"
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div variants={staggerItem}>
                  <StatCard
                    title="平均評価"
                    value={stats.averageRating.toFixed(1)}
                    icon={<StarIcon />}
                    progress={ratingProgress}
                    tooltip="全レビューの平均評価"
                  />
                </motion.div>
              </Grid>
            </Grid>
          </motion.div>

          {/* Insights Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Box
              sx={{
                mt: 5,
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
              role="region"
              aria-label="インサイト"
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  mb: 1,
                }}
              >
                インサイト
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {insight}
              </Typography>
            </Box>
          </motion.div>
        </Container>
      </Layout>
    </AuthGuard>
  );
}
