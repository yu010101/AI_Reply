import { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, Card, CardContent, Divider, List, ListItem, ListItemText, Rating, Chip, CircularProgress } from '@mui/material';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import Layout from '@/components/layout/Layout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import SyncReviewsButton from '@/components/reviews/SyncReviewsButton';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Chart.jsのコンポーネント登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type DashboardStats = {
  totalLocations: number;
  totalReviews: number;
  pendingReviews: number;
  totalReplies: number;
  averageRating: number;
  responseRate: number;
  aiGeneratedReplies: number;
};

type RecentReview = {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  review_date: string;
  location_name: string;
  has_reply: boolean;
  reply: {
    id: string;
    content: string;
    is_ai_generated: boolean;
  } | null;
};

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLocations: 0,
    totalReviews: 0,
    pendingReviews: 0,
    totalReplies: 0,
    averageRating: 0,
    responseRate: 0,
    aiGeneratedReplies: 0
  });
  const [loading, setLoading] = useState(true);
  const [monthlyReviews, setMonthlyReviews] = useState<{month: string; count: number}[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 総合統計情報の取得
      const [
        locationsResult,
        reviewsResult,
        pendingReviewsResult,
        repliesResult,
        aiRepliesResult
      ] = await Promise.all([
        // 店舗数
        supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.id),
        
        // レビュー数
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true }),
        
        // 保留中のレビュー数
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new'),
        
        // 返信数
        supabase
          .from('replies')
          .select('*', { count: 'exact', head: true }),
        
        // AI生成返信数
        supabase
          .from('replies')
          .select('*', { count: 'exact', head: true })
          .eq('is_ai_generated', true)
      ]);

      // 平均評価を取得
      const { data: ratingsData } = await supabase
        .from('reviews')
        .select('rating');
      
      const averageRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, item) => sum + item.rating, 0) / ratingsData.length
        : 0;

      // 返信率を計算
      const responseRate = reviewsResult.count && reviewsResult.count > 0
        ? (repliesResult.count || 0) / reviewsResult.count * 100
        : 0;

      // 統計情報を設定
      setStats({
        totalLocations: locationsResult.count || 0,
        totalReviews: reviewsResult.count || 0,
        pendingReviews: pendingReviewsResult.count || 0,
        totalReplies: repliesResult.count || 0,
        averageRating: parseFloat(averageRating.toFixed(1)),
        responseRate: parseFloat(responseRate.toFixed(1)),
        aiGeneratedReplies: aiRepliesResult.count || 0
      });

      // 月別レビュー数を取得
      await fetchMonthlyReviews();

      // 評価分布を取得
      await fetchRatingDistribution();

      // 最近のレビューを取得
      await fetchRecentReviews();
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReviews = async () => {
    try {
      const now = new Date();
      const result = [];

      // 過去6ヶ月分のデータを取得
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const { count } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lte('created_at', endDate.toISOString());
        
        result.push({
          month: format(date, 'yyyy年M月', { locale: ja }),
          count: count || 0
        });
      }

      setMonthlyReviews(result.reverse());
    } catch (error) {
      console.error('月別レビュー数の取得に失敗しました:', error);
    }
  };

  const fetchRatingDistribution = async () => {
    try {
      const { data } = await supabase
        .from('reviews')
        .select('rating');
      
      if (data) {
        const distribution = [0, 0, 0, 0, 0]; // 1〜5星の評価数

        data.forEach(review => {
          if (review.rating >= 1 && review.rating <= 5) {
            distribution[review.rating - 1]++;
          }
        });

        setRatingDistribution(distribution);
      }
    } catch (error) {
      console.error('評価分布の取得に失敗しました:', error);
    }
  };

  const fetchRecentReviews = async () => {
    try {
      const { data } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          reviewer_name,
          review_date,
          locations (name),
          replies (id, content, is_ai_generated)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        const reviews = data.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          reviewer_name: review.reviewer_name || '匿名',
          review_date: review.review_date,
          location_name: review.locations ? (review.locations as any).name : '',
          has_reply: review.replies && review.replies.length > 0,
          reply: review.replies && review.replies.length > 0 ? review.replies[0] : null,
        }));
        
        setRecentReviews(reviews);
      }
    } catch (error) {
      console.error('最近のレビューの取得に失敗しました:', error);
    }
  };

  const handleSyncComplete = () => {
    fetchDashboardData();
  };

  // 月別レビュー数のチャートデータ
  const monthlyReviewsChartData = {
    labels: monthlyReviews.map(item => item.month),
    datasets: [
      {
        label: 'レビュー数',
        data: monthlyReviews.map(item => item.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // 評価分布のチャートデータ
  const ratingDistributionChartData = {
    labels: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'],
    datasets: [
      {
        data: ratingDistribution,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // レビュー日付のフォーマット
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: ja });
  };

  // レビューステータスに応じたチップの色
  const getReplyStatusChip = (review: RecentReview) => {
    if (!review.has_reply) {
      return <Chip size="small" label="未返信" color="error" />;
    }
    return review.reply?.is_ai_generated 
      ? <Chip size="small" label="AI返信済" color="info" />
      : <Chip size="small" label="返信済" color="success" />;
  };

  if (isLoading || loading) {
    return (
      <AuthGuard>
        <Layout>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="90vh">
            <CircularProgress />
          </Box>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              ダッシュボード
            </Typography>
            <SyncReviewsButton onSyncComplete={handleSyncComplete} />
          </Box>

          {/* 統計カード */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    総レビュー数
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.totalReviews}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    平均評価
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="h4" component="div" mr={1}>
                      {stats.averageRating}
                    </Typography>
                    <Rating 
                      value={stats.averageRating} 
                      precision={0.1} 
                      readOnly 
                      size="small" 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    返信率
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.responseRate}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    AI生成返信数
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.aiGeneratedReplies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* チャートとレビュー一覧 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      月別レビュー数
                    </Typography>
                    <Box height={300}>
                      <Bar 
                        data={monthlyReviewsChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: false,
                            },
                          },
                        }} 
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      評価分布
                    </Typography>
                    <Box height={300} display="flex" justifyContent="center">
                      <Box width="60%" height="100%">
                        <Pie 
                          data={ratingDistributionChartData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                              },
                            },
                          }} 
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  最近のレビュー
                </Typography>
                <List>
                  {recentReviews.length > 0 ? (
                    recentReviews.map((review) => (
                      <ListItem key={review.id} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box display="flex" alignItems="center">
                                <Rating value={review.rating} readOnly size="small" />
                                <Typography variant="body2" ml={1}>
                                  {review.location_name}
                                </Typography>
                              </Box>
                              {getReplyStatusChip(review)}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span" color="text.primary">
                                {review.reviewer_name} - {formatDate(review.review_date)}
                              </Typography>
                              <Typography variant="body2" component="p" sx={{ mt: 0.5 }}>
                                {review.comment && review.comment.length > 100
                                  ? `${review.comment.substring(0, 100)}...`
                                  : review.comment || '(コメントなし)'}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="レビューはまだありません" />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 