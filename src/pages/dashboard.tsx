import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/utils/supabase';
import { Box, Container, Grid, Typography, CircularProgress } from '@mui/material';
import StatCard, { TrendData, ProgressData } from '@/components/dashboard/StatCard';
import ActionableAlert, { AlertAction } from '@/components/dashboard/ActionableAlert';
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

  // Trend data (comparison with last month)
  locationsTrend: TrendData;
  reviewsTrend: TrendData;
  pendingTrend: TrendData;
  repliesTrend: TrendData;

  // Time-series data for sparklines (last 7 days)
  reviewsSparkline: number[];
  repliesSparkline: number[];

  // Alerts
  lowRatingReviews: number;
  lowRatingThisWeek: number;
  lowRatingLastWeek: number;
};

// Helper function to calculate trend
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

// Helper function to generate mock sparkline data (replace with real data)
function generateSparklineData(days: number = 7): number[] {
  return Array.from({ length: days }, () => Math.floor(Math.random() * 10) + 1);
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
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
  });
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

        // Current month stats
        const { count: locationsCount } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id);

        const { count: reviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id);

        const { count: pendingReviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .eq('status', 'pending');

        const { count: repliesCount } = await supabase
          .from('replies')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id);

        // Calculate average rating
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('tenant_id', user.id);

        const avgRating = reviewsData && reviewsData.length > 0
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
          : 0;

        // Calculate response rate
        const responseRate = reviewsCount && reviewsCount > 0
          ? ((repliesCount || 0) / reviewsCount) * 100
          : 0;

        // Last month stats for trends
        const { count: lastMonthLocations } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        const { count: lastMonthReviews } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        const { count: thisMonthReviews } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        const { count: lastMonthReplies } = await supabase
          .from('replies')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        const { count: thisMonthReplies } = await supabase
          .from('replies')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        // Low rating reviews (1-2 stars)
        const { count: lowRatingCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .eq('status', 'pending')
          .lte('rating', 2);

        const { count: lowRatingThisWeek } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .lte('rating', 2)
          .gte('created_at', startOfWeek.toISOString());

        const { count: lowRatingLastWeek } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id)
          .lte('rating', 2)
          .gte('created_at', startOfLastWeek.toISOString())
          .lt('created_at', startOfWeek.toISOString());

        // Generate sparkline data (in production, fetch actual daily data)
        const reviewsSparkline = generateSparklineData(7);
        const repliesSparkline = generateSparklineData(7);

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
          reviewsSparkline,
          repliesSparkline,
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

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <CircularProgress size={48} />
          </Box>
        </Layout>
      </AuthGuard>
    );
  }

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

  const pendingActions: AlertAction[] = [
    {
      label: '未返信レビューを確認',
      onClick: () => router.push('/reviews?filter=pending'),
      variant: 'contained',
      color: 'warning',
    },
  ];

  const lowRatingActions: AlertAction[] = [
    {
      label: '低評価レビューを確認',
      onClick: () => router.push('/reviews?filter=low-rating'),
      variant: 'contained',
      color: 'error',
    },
  ];

  return (
    <AuthGuard>
      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              ダッシュボード
            </Typography>
          </motion.div>

          {/* Actionable Alerts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Box sx={{ mb: 3 }}>
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
                message={`現在の返信率は${stats.responseRate.toFixed(
                  0
                )}%です。目標の80%を目指しましょう。顧客エンゲージメントの向上に繋がります。`}
                actions={pendingActions}
              />
            )}
            </Box>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <motion.div variants={staggerItem}>
                <StatCard
                  title="登録店舗数"
                  value={stats.totalLocations}
                  icon={<StoreIcon />}
                  color="primary"
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
                  color="info"
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
                  title="保留中のレビュー"
                  value={stats.pendingReviews}
                  icon={<PendingActionsIcon />}
                  color="warning"
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
                  color="success"
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
                  color={stats.responseRate >= 80 ? 'success' : stats.responseRate >= 50 ? 'warning' : 'error'}
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
                  color={stats.averageRating >= 4 ? 'success' : stats.averageRating >= 3 ? 'warning' : 'error'}
                  progress={ratingProgress}
                  tooltip="全レビューの平均評価（業界標準: 4.0+）"
                />
              </motion.div>
            </Grid>
            </Grid>
          </motion.div>

          {/* Additional insights section can be added here */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              インサイト
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.averageRating >= 4
                ? '素晴らしい評価を維持しています！この調子で顧客満足度を高めましょう。'
                : stats.averageRating >= 3
                ? '評価は平均的です。低評価レビューに丁寧に対応して改善を目指しましょう。'
                : '評価が低めです。早急に顧客の声に耳を傾け、サービス改善に取り組みましょう。'}
            </Typography>
          </Box>
        </Container>
      </Layout>
    </AuthGuard>
  );
}
