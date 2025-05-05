import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Avatar, Rating, Button, Grid, CircularProgress, Divider, Chip, TextField, IconButton } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Reply as ReplyIcon, ChatBubbleOutline as ChatBubbleOutlineIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';

// レビューの型定義
interface Review {
  id: string;
  platform: string;
  platform_review_id: string;
  location_id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  review_date: string;
  response_text?: string;
  response_date?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  google_place_id: string;
  created_at: string;
  updated_at: string;
}

interface ReviewListProps {
  locationId?: string;
}

export default function ReviewList({ locationId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(locationId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [generatingAIReply, setGeneratingAIReply] = useState<string | null>(null);
  
  // ロケーション一覧取得
  useEffect(() => {
    fetchLocations();
  }, []);

  // 選択されたロケーションが変更されたらレビュー取得
  useEffect(() => {
    if (selectedLocation) {
      fetchReviews(selectedLocation);
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setLocations(data || []);
      
      // ロケーションが選択されていなければ最初のロケーションを選択
      if (!selectedLocation && data && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (err) {
      console.error('ロケーション取得エラー:', err);
      setError('ロケーション情報の取得に失敗しました');
    }
  };

  const fetchReviews = async (locationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('review_date', { ascending: false });
      
      if (error) throw error;
      
      setReviews(data || []);
      
      // 取得成功時に使用量を記録
      await recordUsage('review', data?.length || 0).catch(err => {
        console.warn('使用量記録エラー:', err);
      });
    } catch (err) {
      console.error('レビュー取得エラー:', err);
      setError('レビュー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleReplyChange = (reviewId: string, text: string) => {
    setReplyText(prev => ({ ...prev, [reviewId]: text }));
  };

  const startReply = (reviewId: string) => {
    setReplyingTo(reviewId);
    // 既存の返信がある場合はそれを初期値として設定
    const review = reviews.find(r => r.id === reviewId);
    if (review?.response_text) {
      setReplyText(prev => ({ ...prev, [reviewId]: review.response_text || '' }));
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const submitReply = async (reviewId: string) => {
    try {
      const text = replyText[reviewId];
      if (!text) return;
      
      const { data, error } = await supabase
        .from('reviews')
        .update({
          response_text: text,
          response_date: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      
      // レビュー一覧を更新
      setReviews(reviews.map(r => r.id === reviewId ? data : r));
      setReplyingTo(null);
      
      // TODO: Google APIを使って実際にレビューに返信する処理を追加
      
    } catch (err) {
      console.error('返信送信エラー:', err);
      setError('返信の送信に失敗しました');
    }
  };

  const generateAIReply = async (reviewId: string) => {
    try {
      setGeneratingAIReply(reviewId);
      setError(null);
      
      // 実際のAI返信生成APIを呼び出す
      const response = await fetch('/api/ai-reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          tone: 'friendly', // トーン設定（今後UIで選択できるようにする）
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.limitExceeded) {
          throw {
            limitExceeded: true,
            currentUsage: errorData.currentUsage,
            limit: errorData.limit,
            message: errorData.error || 'AI返信生成の上限に達しました',
          };
        }
        throw new Error(errorData.error || 'AI返信の生成に失敗しました');
      }
      
      const data = await response.json();
      const aiGeneratedReply = data.reply;
      
      setReplyText(prev => ({ ...prev, [reviewId]: aiGeneratedReply }));
      startReply(reviewId);
    } catch (err: any) {
      console.error('AI返信生成エラー:', err);
      if (err.limitExceeded) {
        setError(`AI返信生成の上限に達しました（${err.currentUsage}/${err.limit}）`);
      } else {
        setError('AI返信の生成に失敗しました');
      }
    } finally {
      setGeneratingAIReply(null);
    }
  };

  const syncGoogleReviews = async () => {
    try {
      if (!selectedLocation) return;
      
      setLoading(true);
      setError(null);
      
      // Google Reviews APIを呼び出す
      const response = await fetch(`/api/google-reviews/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: selectedLocation,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'レビューの同期に失敗しました');
      }
      
      // 同期後に再取得
      await fetchReviews(selectedLocation);
      
    } catch (err) {
      console.error('Googleレビュー同期エラー:', err);
      setError('Googleレビューの同期に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          レビュー一覧
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={syncGoogleReviews}
            disabled={loading || !selectedLocation}
          >
            Googleレビューを同期
          </Button>
        </Box>
      </Box>

      {error && (
        <Box mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          ロケーション選択
        </Typography>
        <Grid container spacing={1}>
          {locations.map(location => (
            <Grid item key={location.id}>
              <Chip
                label={location.name}
                onClick={() => handleLocationChange(location.id)}
                color={selectedLocation === location.id ? 'primary' : 'default'}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Box textAlign="center" my={4}>
          <Typography variant="body1">
            レビューはまだありません
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {reviews.map(review => (
            <Grid item xs={12} key={review.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" mb={1}>
                    <Avatar 
                      src={review.reviewer_avatar} 
                      alt={review.reviewer_name}
                      sx={{ mr: 2 }}
                    >
                      {review.reviewer_name?.charAt(0) || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {review.reviewer_name || '匿名ユーザー'}
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" color="textSecondary" ml={1}>
                          {formatDistanceToNow(new Date(review.review_date), {
                            addSuffix: true,
                            locale: ja
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="body1" paragraph>
                    {review.comment || <em>コメントなし</em>}
                  </Typography>

                  {review.response_text && (
                    <Box mt={2} bgcolor="grey.50" p={2} borderRadius={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        あなたの返信
                      </Typography>
                      <Typography variant="body2">
                        {review.response_text}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {review.response_date 
                          ? formatDistanceToNow(new Date(review.response_date), {
                              addSuffix: true,
                              locale: ja
                            })
                          : ''}
                      </Typography>
                    </Box>
                  )}

                  {replyingTo === review.id ? (
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        placeholder="返信を入力..."
                        value={replyText[review.id] || ''}
                        onChange={(e) => handleReplyChange(review.id, e.target.value)}
                      />
                      <Box mt={1} display="flex" justifyContent="flex-end">
                        <Button onClick={cancelReply} sx={{ mr: 1 }}>
                          キャンセル
                        </Button>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          onClick={() => submitReply(review.id)}
                          disabled={!replyText[review.id]}
                        >
                          返信する
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box mt={2} display="flex" justifyContent="flex-end">
                      <Button
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => generateAIReply(review.id)}
                        disabled={!!generatingAIReply}
                        sx={{ mr: 1 }}
                      >
                        {generatingAIReply === review.id ? (
                          <CircularProgress size={24} />
                        ) : 'AI返信生成'}
                      </Button>
                      <Button
                        startIcon={<ReplyIcon />}
                        onClick={() => startReply(review.id)}
                      >
                        返信
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
} 