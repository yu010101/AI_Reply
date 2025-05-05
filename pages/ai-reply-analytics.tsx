import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Card, CardContent, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Rating, Chip } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

// Chart.jsコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ReplyAnalytics {
  totalReplies: number;
  aiGeneratedReplies: number;
  manualReplies: number;
  averageGenerationTime: number;
  averageResponseTime: number;
  monthlyReplies: { month: string; count: number }[];
  toneDistribution: { tone: string; count: number }[];
  templateUsage: { template: string; count: number }[];
}

interface Reply {
  id: string;
  review_id: string;
  content: string;
  is_ai_generated: boolean;
  generation_time: number;
  tone: string;
  template_id: string | null;
  template_name: string | null;
  created_at: string;
  review_rating: number;
  review_comment: string;
  reviewer_name: string;
  location_name: string;
}

export default function AIReplyAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ReplyAnalytics>({
    totalReplies: 0,
    aiGeneratedReplies: 0,
    manualReplies: 0,
    averageGenerationTime: 0,
    averageResponseTime: 0,
    monthlyReplies: [],
    toneDistribution: [],
    templateUsage: [],
  });
  const [recentReplies, setRecentReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      fetchRecentReplies();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // 総返信数を取得
      const { count: totalReplies, error: totalError } = await supabase
        .from('replies')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // AI生成返信数を取得
      const { count: aiReplies, error: aiError } = await supabase
        .from('replies')
        .select('*', { count: 'exact', head: true })
        .eq('is_ai_generated', true);

      if (aiError) throw aiError;

      // 月別返信数を取得（過去6ヶ月）
      const monthlyData: { [key: string]: number } = {};
      const now = new Date();
      
      for (let i = 0; i < 6; i++) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'yyyy年M月', { locale: ja });
        
        const startDate = format(new Date(monthKey + '-01'), 'yyyy-MM-dd');
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const endDate = format(nextMonth, 'yyyy-MM-dd');
        
        const { count, error: monthError } = await supabase
          .from('replies')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (monthError) throw monthError;
        
        monthlyData[monthLabel] = count || 0;
      }

      // トーン分布を取得
      const { data: toneData, error: toneError } = await supabase
        .from('replies')
        .select('tone')
        .not('tone', 'is', null);

      if (toneError) throw toneError;

      const toneDistribution: { [key: string]: number } = {};
      toneData.forEach(item => {
        const tone = item.tone || '未指定';
        toneDistribution[tone] = (toneDistribution[tone] || 0) + 1;
      });

      // テンプレート使用状況を取得
      const { data: templateData, error: templateError } = await supabase
        .from('replies')
        .select(`
          template_id,
          templates:reply_templates(name)
        `)
        .not('template_id', 'is', null);

      if (templateError) throw templateError;

      const templateUsage: { [key: string]: number } = {};
      templateData.forEach(item => {
        const templateName = item.templates ? (item.templates as any).name || '不明なテンプレート' : '不明なテンプレート';
        templateUsage[templateName] = (templateUsage[templateName] || 0) + 1;
      });

      // 平均生成時間を取得
      const { data: timeData, error: timeError } = await supabase
        .from('replies')
        .select('generation_time')
        .not('generation_time', 'is', null);

      if (timeError) throw timeError;

      const totalTime = timeData.reduce((sum, item) => sum + (item.generation_time || 0), 0);
      const averageTime = timeData.length > 0 ? totalTime / timeData.length : 0;

      // レビュー投稿から返信までの平均時間を取得
      const { data: responseTimeData, error: responseTimeError } = await supabase
        .from('replies')
        .select(`
          created_at,
          reviews(review_date)
        `);

      if (responseTimeError) throw responseTimeError;

      let totalResponseTime = 0;
      let validResponseCount = 0;

      responseTimeData.forEach(item => {
        const reviewDate = item.reviews ? (item.reviews as any).review_date : null;
        if (reviewDate && item.created_at) {
          const reviewTimestamp = new Date(reviewDate).getTime();
          const replyTimestamp = new Date(item.created_at).getTime();
          const diffHours = (replyTimestamp - reviewTimestamp) / (1000 * 60 * 60);
          
          if (diffHours > 0) {
            totalResponseTime += diffHours;
            validResponseCount++;
          }
        }
      });

      const averageResponseTime = validResponseCount > 0 ? totalResponseTime / validResponseCount : 0;

      // 分析データをセット
      setAnalytics({
        totalReplies: totalReplies || 0,
        aiGeneratedReplies: aiReplies || 0,
        manualReplies: (totalReplies || 0) - (aiReplies || 0),
        averageGenerationTime: parseFloat(averageTime.toFixed(2)),
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        monthlyReplies: Object.keys(monthlyData).map(month => ({
          month,
          count: monthlyData[month]
        })).reverse(),
        toneDistribution: Object.keys(toneDistribution).map(tone => ({
          tone: translateTone(tone),
          count: toneDistribution[tone]
        })),
        templateUsage: Object.keys(templateUsage).map(template => ({
          template,
          count: templateUsage[template]
        })).sort((a, b) => b.count - a.count).slice(0, 5),
      });
    } catch (err) {
      console.error('分析データ取得エラー:', err);
      setError('分析データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .select(`
          *,
          reviews(id, rating, comment, reviewer_name),
          locations(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedReplies = data.map(item => ({
        id: item.id,
        review_id: item.review_id,
        content: item.content,
        is_ai_generated: item.is_ai_generated,
        generation_time: item.generation_time,
        tone: item.tone,
        template_id: item.template_id,
        template_name: item.template_name,
        created_at: item.created_at,
        review_rating: item.reviews?.rating || 0,
        review_comment: item.reviews?.comment || '',
        reviewer_name: item.reviews?.reviewer_name || '',
        location_name: item.locations?.name || '',
      }));

      setRecentReplies(formattedReplies);
    } catch (err) {
      console.error('最近の返信取得エラー:', err);
    }
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // トーン名を日本語に変換
  const translateTone = (tone: string) => {
    const toneMap: { [key: string]: string } = {
      'friendly': '親しみやすい',
      'formal': 'フォーマル',
      'apologetic': '謝罪',
      'grateful': '感謝',
      'professional': 'ビジネス',
    };
    return toneMap[tone] || tone;
  };

  // AI生成比率のチャートデータ
  const aiRatioChartData = {
    labels: ['AI生成', '手動入力'],
    datasets: [
      {
        data: [analytics.aiGeneratedReplies, analytics.manualReplies],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // トーン分布のチャートデータ
  const toneChartData = {
    labels: analytics.toneDistribution.map(item => item.tone),
    datasets: [
      {
        label: '返信数',
        data: analytics.toneDistribution.map(item => item.count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // 月別返信数のチャートデータ
  const monthlyChartData = {
    labels: analytics.monthlyReplies.map(item => item.month),
    datasets: [
      {
        label: '返信数',
        data: analytics.monthlyReplies.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            AI返信分析
          </Typography>

          {error && (
            <Typography color="error" paragraph>
              {error}
            </Typography>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* 概要カード */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        総返信数
                      </Typography>
                      <Typography variant="h3" color="primary">
                        {analytics.totalReplies}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        AI生成率
                      </Typography>
                      <Typography variant="h3" color="primary">
                        {analytics.totalReplies > 0
                          ? `${Math.round((analytics.aiGeneratedReplies / analytics.totalReplies) * 100)}%`
                          : '0%'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        平均生成時間
                      </Typography>
                      <Typography variant="h3" color="primary">
                        {analytics.averageGenerationTime}秒
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        平均返信時間
                      </Typography>
                      <Typography variant="h3" color="primary">
                        {analytics.averageResponseTime.toFixed(1)}時間
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* グラフセクション */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        AI生成比率
                      </Typography>
                      <Box height={250}>
                        <Pie
                          data={aiRatioChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        月別返信数
                      </Typography>
                      <Box height={250}>
                        <Bar
                          data={monthlyChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: '返信数'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        トーン分布
                      </Typography>
                      <Box height={250}>
                        <Pie
                          data={toneChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        よく使われるテンプレート
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>テンプレート名</TableCell>
                              <TableCell align="right">使用回数</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analytics.templateUsage.length > 0 ? (
                              analytics.templateUsage.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.template}</TableCell>
                                  <TableCell align="right">{item.count}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} align="center">
                                  テンプレートの使用データがありません
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* 最近の返信 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                最近の返信履歴
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>日付</TableCell>
                      <TableCell>店舗</TableCell>
                      <TableCell>評価</TableCell>
                      <TableCell>レビュー</TableCell>
                      <TableCell>返信内容</TableCell>
                      <TableCell>生成方法</TableCell>
                      <TableCell>トーン</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentReplies.length > 0 ? (
                      recentReplies.map((reply) => (
                        <TableRow key={reply.id}>
                          <TableCell>{formatDate(reply.created_at)}</TableCell>
                          <TableCell>{reply.location_name}</TableCell>
                          <TableCell>
                            <Rating value={reply.review_rating} readOnly size="small" />
                          </TableCell>
                          <TableCell>
                            {reply.review_comment.length > 30
                              ? `${reply.review_comment.substring(0, 30)}...`
                              : reply.review_comment}
                          </TableCell>
                          <TableCell>
                            {reply.content.length > 30
                              ? `${reply.content.substring(0, 30)}...`
                              : reply.content}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={reply.is_ai_generated ? 'AI生成' : '手動入力'}
                              color={reply.is_ai_generated ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {reply.tone ? translateTone(reply.tone) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          返信履歴がありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 