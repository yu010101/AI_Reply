import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Review } from '@/types';
import axios from 'axios';

export const ReviewManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');

  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) params.append('status', status);
      if (locationId) params.append('location_id', locationId);

      const response = await axios.get<{ data: Review[]; pagination: { total: number } }>(
        `/api/reviews?${params.toString()}`
      );
      setReviews(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('レビューの取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, status, locationId]);

  const handleStatusChange = async (reviewId: string, newStatus: string) => {
    try {
      await axios.put(`/api/reviews/${reviewId}`, { status: newStatus });
      fetchReviews();
    } catch (error) {
      console.error('レビューの更新に失敗しました:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        レビュー管理
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={status}
            label="ステータス"
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="pending">未対応</MenuItem>
            <MenuItem value="responded">対応済み</MenuItem>
            <MenuItem value="ignored">無視</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {reviews.map((review) => (
          <Grid item xs={12} key={review.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{review.author}</Typography>
                <Typography color="textSecondary">評価: {'★'.repeat(review.rating)}</Typography>
                <Typography sx={{ mt: 1 }}>{review.comment}</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleStatusChange(review.id, 'responded')}
                  >
                    対応済み
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleStatusChange(review.id, 'ignored')}
                  >
                    無視
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Pagination
          count={Math.ceil(total / limit)}
          page={page}
          onChange={(_, value) => setPage(value)}
        />
      </Box>
    </Box>
  );
}; 