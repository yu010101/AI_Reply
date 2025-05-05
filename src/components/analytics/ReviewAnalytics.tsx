import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Paper, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { Bar, Pie, Line, Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { supabase } from '@/utils/supabase';
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

interface Review {
  id: string;
  rating: number;
  review_date: string;
  response_date: string | null;
  platform: string;
  location_id: string;
}

interface Location {
  id: string;
  name: string;
}

interface RatingDistribution {
  rating: number;
  count: number;
}

interface MonthlyData {
  month: string;
  count: number;
  averageRating: number;
}

interface ResponseTimeData {
  responseTime: number;
  count: number;
}

export default function ReviewAnalytics() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 分析データ
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [responseRate, setResponseRate] = useState(0);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [selectedLocation]);

  useEffect(() => {
    if (reviews.length > 0) {
      analyzeReviews();
    }
  }, [reviews]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setLocations(data || []);
    } catch (err) {
      console.error('ロケーション取得エラー:', err);
      setError('ロケーション情報の取得に失敗しました');
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('reviews')
        .select('id, rating, review_date, response_date, platform, location_id');
      
      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setReviews(data || []);
    } catch (err) {
      console.error('レビュー取得エラー:', err);
      setError('レビュー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const analyzeReviews = () => {
    // 評価分布の計算
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      const rating = review.rating;
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating as keyof typeof ratingCounts]++;
      }
    });
    
    const ratingDist = Object.entries(ratingCounts).map(([rating, count]) => ({
      rating: parseInt(rating),
      count
    }));
    setRatingDistribution(ratingDist);

    // 月別データの計算（過去6ヶ月）
    const monthlyStats: Record<string, { count: number, totalRating: number }> = {};
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      monthlyStats[monthKey] = { count: 0, totalRating: 0 };
    }
    
    reviews.forEach(review => {
      const reviewDate = new Date(review.review_date);
      const monthKey = format(reviewDate, 'yyyy-MM');
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].count++;
        monthlyStats[monthKey].totalRating += review.rating;
      }
    });
    
    const monthlyDataArray = Object.entries(monthlyStats).map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'yyyy年M月', { locale: ja }),
      count: data.count,
      averageRating: data.count > 0 ? data.totalRating / data.count : 0
    })).reverse();
    
    setMonthlyData(monthlyDataArray);

    // 返信率の計算
    const totalReviews = reviews.length;
    const respondedReviews = reviews.filter(review => review.response_date).length;
    const respRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0;
    setResponseRate(respRate);

    // 返信時間の分布（日数）
    const responseTimeBuckets: Record<string, number> = {
      '1': 0,  // 1日以内
      '3': 0,  // 1-3日
      '7': 0,  // 3-7日
      '14': 0, // 7-14日
      '30': 0, // 14-30日
      '31': 0  // 30日以上
    };
    
    reviews.forEach(review => {
      if (review.response_date && review.review_date) {
        const reviewDate = new Date(review.review_date);
        const responseDate = new Date(review.response_date);
        const diffTime = responseDate.getTime() - reviewDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 1) responseTimeBuckets['1']++;
        else if (diffDays <= 3) responseTimeBuckets['3']++;
        else if (diffDays <= 7) responseTimeBuckets['7']++;
        else if (diffDays <= 14) responseTimeBuckets['14']++;
        else if (diffDays <= 30) responseTimeBuckets['30']++;
        else responseTimeBuckets['31']++;
      }
    });
    
    const responseTimeArray = [
      { responseTime: 1, count: responseTimeBuckets['1'] },
      { responseTime: 3, count: responseTimeBuckets['3'] },
      { responseTime: 7, count: responseTimeBuckets['7'] },
      { responseTime: 14, count: responseTimeBuckets['14'] },
      { responseTime: 30, count: responseTimeBuckets['30'] },
      { responseTime: 31, count: responseTimeBuckets['31'] }
    ];
    
    setResponseTimeData(responseTimeArray);
  };

  const handleLocationChange = (event: SelectChangeEvent) => {
    setSelectedLocation(event.target.value);
  };

  // グラフ設定
  const ratingChartData = {
    labels: ratingDistribution.map(item => `${item.rating}点`),
    datasets: [
      {
        label: 'レビュー数',
        data: ratingDistribution.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartData = {
    labels: monthlyData.map(item => item.month),
    datasets: [
      {
        type: 'bar' as const,
        label: 'レビュー数',
        data: monthlyData.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: '平均評価',
        data: monthlyData.map(item => item.averageRating),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const responseTimeChartData = {
    labels: [
      '1日以内',
      '1-3日',
      '3-7日',
      '7-14日',
      '14-30日',
      '30日以上'
    ],
    datasets: [
      {
        label: '返信数',
        data: responseTimeData.map(item => item.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderWidth: 1,
      },
    ],
  };

  const responseRateChartData = {
    labels: ['返信済み', '未返信'],
    datasets: [
      {
        label: 'レビュー数',
        data: [
          reviews.filter(review => review.response_date).length,
          reviews.filter(review => !review.response_date).length
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          レビュー分析
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="location-select-label">店舗</InputLabel>
          <Select
            labelId="location-select-label"
            value={selectedLocation}
            label="店舗"
            onChange={handleLocationChange}
          >
            <MenuItem value="all">すべての店舗</MenuItem>
            {locations.map(location => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Typography color="error" paragraph>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            分析するレビューデータがありません
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* 概要カード */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  レビュー概要
                </Typography>
                <Box mt={2}>
                  <Typography variant="body1">
                    総レビュー数: {reviews.length}
                  </Typography>
                  <Typography variant="body1">
                    平均評価: {(reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)} / 5.0
                  </Typography>
                  <Typography variant="body1">
                    返信率: {responseRate.toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 評価分布グラフ */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  評価分布
                </Typography>
                <Box height={300}>
                  <Bar
                    data={ratingChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'レビュー数'
                          }
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 月別トレンドグラフ */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  月別トレンド
                </Typography>
                <Box height={350}>
                  <Chart
                    type='bar'
                    data={monthlyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'レビュー数'
                          },
                          position: 'left',
                        },
                        y1: {
                          beginAtZero: true,
                          max: 5,
                          title: {
                            display: true,
                            text: '平均評価'
                          },
                          position: 'right',
                          grid: {
                            drawOnChartArea: false,
                          },
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 返信率グラフ */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  返信率
                </Typography>
                <Box height={300}>
                  <Pie
                    data={responseRateChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 返信時間グラフ */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  返信時間
                </Typography>
                <Box height={300}>
                  <Bar
                    data={responseTimeChartData}
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
      )}
    </Box>
  );
} 