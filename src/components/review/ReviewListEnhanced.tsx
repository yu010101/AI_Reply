import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, Card, CardContent, Avatar, Rating, Button, Grid, Chip, TextField, IconButton, Collapse } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Reply as ReplyIcon, AutoAwesome as AutoAwesomeIcon, Edit as EditIcon, Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';
import { staggerContainer, staggerItem } from '@/utils/animations';
import TypingIndicator from '@/components/animations/TypingIndicator';
import SkeletonCard from '@/components/animations/SkeletonCard';
import SuccessCheckmark from '@/components/animations/SuccessCheckmark';
import { useToastContext } from '@/contexts/ToastContext';
import { useConfetti } from '@/hooks/useConfetti';

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

interface ReviewListEnhancedProps {
  locationId?: string;
}

export default function ReviewListEnhanced({ locationId }: ReviewListEnhancedProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(locationId || null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [generatingAIReply, setGeneratingAIReply] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [successReply, setSuccessReply] = useState<string | null>(null);

  const toast = useToastContext();
  const { celebration } = useConfetti();

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchReviews(selectedLocation);
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setLocations(data || []);

      if (!selectedLocation && data && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (err) {
      console.error('ロケーション取得エラー:', err);
      toast.error('ロケーション情報の取得に失敗しました');
    }
  };

  const fetchReviews = async (locationId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('review_date', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      await recordUsage('review', data?.length || 0).catch(err => {
        console.warn('使用量記録エラー:', err);
      });
    } catch (err) {
      console.error('レビュー取得エラー:', err);
      toast.error('レビュー情報の取得に失敗しました');
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

      setSubmittingReply(reviewId);

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

      setReviews(reviews.map(r => r.id === reviewId ? data : r));
      setReplyingTo(null);
      setSuccessReply(reviewId);

      // Check for milestones
      const totalReplies = reviews.filter(r => r.response_text).length + 1;
      if (totalReplies === 1) {
        celebration('first');
        toast.success('初めての返信おめでとうございます！', 5000);
      } else if (totalReplies === 100) {
        celebration(100);
        toast.success('100件の返信達成！素晴らしいです！', 5000);
      } else {
        toast.success('返信を送信しました');
      }

      setTimeout(() => setSuccessReply(null), 2000);
    } catch (err) {
      console.error('返信送信エラー:', err);
      toast.error('返信の送信に失敗しました');
    } finally {
      setSubmittingReply(null);
    }
  };

  const generateAIReply = async (reviewId: string) => {
    try {
      setGeneratingAIReply(reviewId);

      const response = await fetch('/api/ai-reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          tone: 'friendly',
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
      toast.success('AI返信を生成しました');
    } catch (err: any) {
      console.error('AI返信生成エラー:', err);
      if (err.limitExceeded) {
        toast.error(`AI返信生成の上限に達しました（${err.currentUsage}/${err.limit}）`);
      } else {
        toast.error('AI返信の生成に失敗しました');
      }
    } finally {
      setGeneratingAIReply(null);
    }
  };

  const syncGoogleReviews = async () => {
    try {
      if (!selectedLocation) return;

      setLoading(true);

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

      await fetchReviews(selectedLocation);
      toast.success('Googleレビューを同期しました');
    } catch (err) {
      console.error('Googleレビュー同期エラー:', err);
      toast.error('Googleレビューの同期に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Typography variant="h5" component="h1">
            レビュー一覧
          </Typography>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={syncGoogleReviews}
            disabled={loading || !selectedLocation}
            className="hover-scale"
          >
            Googleレビューを同期
          </Button>
        </motion.div>
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
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
                  className="transition-smooth"
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </motion.div>

      {loading ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            {[...Array(3)].map((_, i) => (
              <Grid item xs={12} key={i}>
                <motion.div variants={staggerItem}>
                  <SkeletonCard variant="review" />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      ) : reviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Box textAlign="center" my={4}>
            <Typography variant="body1">
              レビューはまだありません
            </Typography>
          </Box>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            {reviews.map((review) => (
              <Grid item xs={12} key={review.id}>
                <motion.div variants={staggerItem}>
                  <Card
                    variant="outlined"
                    className="hover-lift transition-smooth"
                    sx={{ position: 'relative', overflow: 'visible' }}
                  >
                    <CardContent>
                      <Box display="flex" mb={1}>
                        <Avatar
                          src={review.reviewer_avatar}
                          alt={review.reviewer_name}
                          sx={{ mr: 2 }}
                        >
                          {review.reviewer_name?.charAt(0) || '?'}
                        </Avatar>
                        <Box flex={1}>
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

                        <AnimatePresence>
                          {successReply === review.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              style={{ position: 'absolute', top: 16, right: 16 }}
                            >
                              <SuccessCheckmark size={48} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Box>

                      <Typography variant="body1" paragraph>
                        {review.comment || <em>コメントなし</em>}
                      </Typography>

                      <AnimatePresence>
                        {review.response_text && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
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
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence mode="wait">
                        {replyingTo === review.id ? (
                          <motion.div
                            key="reply-form"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
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
                              <Box mt={1} display="flex" justifyContent="flex-end" gap={1}>
                                <Button
                                  onClick={cancelReply}
                                  className="transition-smooth"
                                  startIcon={<CloseIcon />}
                                >
                                  キャンセル
                                </Button>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => submitReply(review.id)}
                                  disabled={!replyText[review.id] || submittingReply === review.id}
                                  startIcon={submittingReply === review.id ? null : <SendIcon />}
                                  className="hover-scale"
                                >
                                  {submittingReply === review.id ? '送信中...' : '返信する'}
                                </Button>
                              </Box>
                            </Box>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="reply-buttons"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
                              <Button
                                startIcon={generatingAIReply === review.id ? null : <AutoAwesomeIcon />}
                                onClick={() => generateAIReply(review.id)}
                                disabled={!!generatingAIReply}
                                className="transition-smooth hover-scale"
                              >
                                {generatingAIReply === review.id ? (
                                  <TypingIndicator />
                                ) : 'AI返信生成'}
                              </Button>
                              <Button
                                startIcon={<ReplyIcon />}
                                onClick={() => startReply(review.id)}
                                variant={review.response_text ? 'outlined' : 'contained'}
                                className="transition-smooth hover-scale"
                              >
                                {review.response_text ? '編集' : '返信'}
                              </Button>
                            </Box>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}
    </Box>
  );
}
