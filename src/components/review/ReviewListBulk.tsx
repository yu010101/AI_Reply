import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Avatar, Rating, Button, Grid, CircularProgress, Divider, Chip, TextField, IconButton, Collapse, Dialog, DialogContent, Checkbox, ButtonGroup } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Reply as ReplyIcon, ChatBubbleOutline as ChatBubbleOutlineIcon, AutoAwesome as AutoAwesomeIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon, CheckBox as CheckBoxIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import { recordUsage } from '@/utils/usage-metrics';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';
import AIReplyPreviewDialog from './AIReplyPreviewDialog';
import AIGeneratingLoader from './AIGeneratingLoader';
import SuccessCelebration from './SuccessCelebration';
import { BulkActionBar } from './BulkActionBar';
import { BulkReplyProgress } from './BulkReplyProgress';
import { BulkReplyReview } from './BulkReplyReview';

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

interface ReviewProgress {
  reviewId: string;
  reviewerName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface GeneratedReply {
  reviewId: string;
  reply: string;
  success: boolean;
  error?: string;
}

export default function ReviewListBulk({ locationId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(locationId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [generatingAIReply, setGeneratingAIReply] = useState<string | null>(null);
  const [selectedTones, setSelectedTones] = useState<Record<string, Tone>>({});
  const [showToneSelector, setShowToneSelector] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGeneratingDialog, setShowGeneratingDialog] = useState(false);

  // Bulk functionality states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<ReviewProgress[]>([]);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [generatedBulkReplies, setGeneratedBulkReplies] = useState<GeneratedReply[]>([]);
  const [showBulkReview, setShowBulkReview] = useState(false);

  // LocalStorageからトーン設定を読み込む
  useEffect(() => {
    const savedTone = localStorage.getItem('ai-reply-last-tone');
    if (savedTone && ['polite', 'friendly', 'apologetic', 'grateful', 'professional'].includes(savedTone)) {
      // 全レビューのデフォルトトーンとして設定
      const defaultTones: Record<string, Tone> = {};
      reviews.forEach(review => {
        defaultTones[review.id] = savedTone as Tone;
      });
      setSelectedTones(defaultTones);
    }
  }, [reviews]);

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
    // ロケーション変更時は選択をクリア
    setSelectedReviews(new Set());
    setSelectionMode(false);
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

      // Show success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (err) {
      console.error('返信送信エラー:', err);
      setError('返信の送信に失敗しました');
    }
  };

  const handleToneChange = (reviewId: string, tone: Tone) => {
    setSelectedTones(prev => ({ ...prev, [reviewId]: tone }));
    // LocalStorageに保存
    localStorage.setItem('ai-reply-last-tone', tone);
  };

  const generateAIReply = async (reviewId: string) => {
    try {
      setGeneratingAIReply(reviewId);
      setCurrentReviewId(reviewId);
      setShowGeneratingDialog(true);
      setError(null);

      // 選択されたトーンを取得（なければデフォルト）
      const tone = selectedTones[reviewId] || DEFAULT_TONE;

      // 実際のAI返信生成APIを呼び出す
      const response = await fetch('/api/ai-reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setShowGeneratingDialog(false);
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
      setShowToneSelector(null); // トーンセレクターを閉じる
      setShowGeneratingDialog(false);
      setShowPreviewDialog(true);
    } catch (err: any) {
      console.error('AI返信生成エラー:', err);
      setShowGeneratingDialog(false);
      if (err.limitExceeded) {
        setError(`AI返信生成の上限に達しました（${err.currentUsage}/${err.limit}）`);
      } else {
        setError('AI返信の生成に失敗しました');
      }
    } finally {
      setGeneratingAIReply(null);
    }
  };

  const handleAIReplyClick = (reviewId: string) => {
    // トーンセレクターを表示/非表示
    if (showToneSelector === reviewId) {
      setShowToneSelector(null);
    } else {
      // デフォルトトーンが設定されていない場合は設定
      if (!selectedTones[reviewId]) {
        const savedTone = localStorage.getItem('ai-reply-last-tone');
        const defaultTone = (savedTone && ['polite', 'friendly', 'apologetic', 'grateful', 'professional'].includes(savedTone))
          ? (savedTone as Tone)
          : DEFAULT_TONE;
        setSelectedTones(prev => ({ ...prev, [reviewId]: defaultTone }));
      }
      setShowToneSelector(reviewId);
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

  // Bulk selection handlers
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedReviews(new Set());
    }
  };

  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allReviewIds = reviews.map(r => r.id);
    setSelectedReviews(new Set(allReviewIds));
  };

  const handleSelectUnreplied = () => {
    const unrepliedReviewIds = reviews
      .filter(r => !r.response_text)
      .map(r => r.id);
    setSelectedReviews(new Set(unrepliedReviewIds));
  };

  const handleCancelSelection = () => {
    setSelectedReviews(new Set());
    setSelectionMode(false);
  };

  const handleBulkGenerate = async () => {
    if (selectedReviews.size === 0) return;

    setBulkGenerating(true);
    setShowBulkProgress(true);
    setCurrentBulkIndex(0);

    // Initialize progress tracking
    const progressData: ReviewProgress[] = Array.from(selectedReviews).map(reviewId => {
      const review = reviews.find(r => r.id === reviewId);
      return {
        reviewId,
        reviewerName: review?.reviewer_name || '匿名ユーザー',
        status: 'pending' as const,
      };
    });
    setBulkProgress(progressData);

    try {
      const reviewIds = Array.from(selectedReviews);
      const tone = DEFAULT_TONE; // Use default tone for bulk, or could add UI to select

      // Call bulk generation API
      const response = await fetch('/api/ai-reply/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewIds,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.limitExceeded) {
          setError(`AI返信生成の上限に達しました（${errorData.currentUsage}/${errorData.limit}）`);
        } else {
          setError(errorData.error || '一括AI返信生成に失敗しました');
        }
        setShowBulkProgress(false);
        setBulkGenerating(false);
        return;
      }

      const data = await response.json();
      const { results, summary } = data;

      // Update progress with results
      const finalProgress: ReviewProgress[] = progressData.map((item) => {
        const result = results.find((r: GeneratedReply) => r.reviewId === item.reviewId);
        return {
          ...item,
          status: result?.success ? 'success' : 'error',
          error: result?.error,
        };
      });
      setBulkProgress(finalProgress);
      setCurrentBulkIndex(reviewIds.length);
      setGeneratedBulkReplies(results);

      // Wait a moment to show completion
      setTimeout(() => {
        setShowBulkProgress(false);
        if (summary.success > 0) {
          setShowBulkReview(true);
        }
      }, 1500);

    } catch (err) {
      console.error('一括AI返信生成エラー:', err);
      setError('一括AI返信生成に失敗しました');
      setShowBulkProgress(false);
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleBulkPostAll = async (replies: { reviewId: string; reply: string }[]) => {
    try {
      // Post each reply to the database
      for (const { reviewId, reply } of replies) {
        const { data, error } = await supabase
          .from('reviews')
          .update({
            response_text: reply,
            response_date: new Date().toISOString(),
          })
          .eq('id', reviewId)
          .select()
          .single();

        if (error) {
          console.error('返信投稿エラー:', reviewId, error);
          continue;
        }

        // Update local state
        setReviews(reviews.map(r => r.id === reviewId ? data : r));
      }

      // Clear selection and show success
      setSelectedReviews(new Set());
      setSelectionMode(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (err) {
      console.error('一括返信投稿エラー:', err);
      setError('返信の投稿に失敗しました');
    }
  };

  const handleRegenerateReply = async (reviewId: string) => {
    try {
      const tone = selectedTones[reviewId] || DEFAULT_TONE;

      const response = await fetch('/api/ai-reply/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          tone,
        }),
      });

      if (!response.ok) {
        throw new Error('再生成に失敗しました');
      }

      const data = await response.json();
      const aiGeneratedReply = data.reply;

      // Update the generated bulk replies
      setGeneratedBulkReplies(prev =>
        prev.map(r => r.reviewId === reviewId
          ? { ...r, reply: aiGeneratedReply }
          : r
        )
      );

    } catch (err) {
      console.error('AI返信再生成エラー:', err);
      setError('AI返信の再生成に失敗しました');
    }
  };

  const unrepliedCount = reviews.filter(r => !r.response_text).length;

  return (
    <Box pb={selectedReviews.size > 0 ? 10 : 0}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          レビュー一覧
        </Typography>
        <Box display="flex" gap={2}>
          {!selectionMode && (
            <>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleToggleSelectionMode}
                disabled={loading || reviews.length === 0}
              >
                一括選択モード
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={syncGoogleReviews}
                disabled={loading || !selectedLocation}
              >
                Googleレビューを同期
              </Button>
            </>
          )}
          {selectionMode && (
            <ButtonGroup variant="outlined">
              <Button onClick={handleSelectAll}>
                すべて選択
              </Button>
              <Button onClick={handleSelectUnreplied}>
                未返信のみ選択 ({unrepliedCount})
              </Button>
            </ButtonGroup>
          )}
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
              <Card
                variant="outlined"
                sx={{
                  position: 'relative',
                  border: selectedReviews.has(review.id) ? '2px solid' : undefined,
                  borderColor: selectedReviews.has(review.id) ? 'primary.main' : undefined,
                }}
              >
                {selectionMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1,
                    }}
                  >
                    <Checkbox
                      checked={selectedReviews.has(review.id)}
                      onChange={() => handleSelectReview(review.id)}
                      icon={<CheckBoxOutlineBlankIcon />}
                      checkedIcon={<CheckBoxIcon />}
                    />
                  </Box>
                )}
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

                  {!selectionMode && (
                    <>
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
                        <Box mt={2}>
                          <Collapse in={showToneSelector === review.id}>
                            <Box mb={2}>
                              <ToneSelector
                                selectedTone={selectedTones[review.id] || DEFAULT_TONE}
                                onToneChange={(tone) => handleToneChange(review.id, tone)}
                              />
                              <Box display="flex" justifyContent="flex-end" gap={1}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setShowToneSelector(null)}
                                >
                                  キャンセル
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={generatingAIReply === review.id ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                                  onClick={() => generateAIReply(review.id)}
                                  disabled={!!generatingAIReply}
                                >
                                  {generatingAIReply === review.id ? '生成中...' : '生成する'}
                                </Button>
                              </Box>
                            </Box>
                          </Collapse>

                          {!showToneSelector && (
                            <Box display="flex" justifyContent="flex-end">
                              <Button
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => handleAIReplyClick(review.id)}
                                disabled={!!generatingAIReply}
                                sx={{ mr: 1 }}
                              >
                                AI返信生成
                              </Button>
                              <Button
                                startIcon={<ReplyIcon />}
                                onClick={() => startReply(review.id)}
                              >
                                返信
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedReviews.size}
        onGenerateBulk={handleBulkGenerate}
        onCancel={handleCancelSelection}
        isGenerating={bulkGenerating}
      />

      {/* Bulk Progress Dialog */}
      <BulkReplyProgress
        open={showBulkProgress}
        reviews={bulkProgress}
        currentIndex={currentBulkIndex}
        totalCount={selectedReviews.size}
      />

      {/* Bulk Review Dialog */}
      <BulkReplyReview
        open={showBulkReview}
        generatedReplies={generatedBulkReplies}
        reviews={reviews}
        onClose={() => setShowBulkReview(false)}
        onPostAll={handleBulkPostAll}
        onRegenerate={handleRegenerateReply}
      />

      {/* Single reply dialogs */}
      {currentReviewId && (
        <AIReplyPreviewDialog
          open={showPreviewDialog}
          generatedReply={replyText[currentReviewId] || ''}
          reviewId={currentReviewId}
          onClose={() => setShowPreviewDialog(false)}
          onPost={(editedReply) => {
            setReplyText(prev => ({ ...prev, [currentReviewId]: editedReply }));
            setShowPreviewDialog(false);
            startReply(currentReviewId);
          }}
          onRegenerate={() => {
            setShowPreviewDialog(false);
            generateAIReply(currentReviewId);
          }}
        />
      )}

      <AIGeneratingLoader open={showGeneratingDialog} />
      <SuccessCelebration show={showSuccess} />
    </Box>
  );
}
