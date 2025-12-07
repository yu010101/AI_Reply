import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  TextField,
  InputAdornment,
  Chip,
  Rating,
  Paper,
  Collapse,
  IconButton,
  Checkbox,
  Avatar,
  Tooltip,
  Fab,
  Zoom,
  Badge,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as AutoAwesomeIcon,
  Reply as ReplyIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  SelectAll as SelectAllIcon,
  CheckCircle as CheckCircleIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import axios from 'axios';
import { Review } from '@/types';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import AIReplyPreviewDialog from '@/components/review/AIReplyPreviewDialog';
import { BulkReplyProgress } from '@/components/review/BulkReplyProgress';
import SuccessCelebration from '@/components/review/SuccessCelebration';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

type SortOption = 'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc';
type DateRangePreset = 'all' | 'last7days' | 'last30days' | 'custom';
type ReplyStatusFilter = 'all' | 'replied' | 'unreplied';

interface ReviewProgress {
  reviewId: string;
  reviewerName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  generatedReply?: string;
}

export const ReviewManagementUltimate = () => {
  // Basic states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [replyStatusFilter, setReplyStatusFilter] = useState<ReplyStatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Selection states
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // AI Reply states
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);
  const [generatingReviewId, setGeneratingReviewId] = useState<string | null>(null);
  const [generatedReplies, setGeneratedReplies] = useState<Record<string, string>>({});

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewReviewId, setPreviewReviewId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Bulk generation
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<ReviewProgress[]>([]);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);

  // Success celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Posting state
  const [postingReviewId, setPostingReviewId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, status, locationId]);

  // Toggle rating filter
  const handleRatingToggle = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating)
        ? prev.filter((r) => r !== rating)
        : [...prev, rating]
    );
    setPage(1);
  };

  // Calculate date range based on preset
  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'last7days':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case 'last30days':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: null, end: null };
    }
  };

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = [...reviews];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.author.toLowerCase().includes(query) ||
          review.comment.toLowerCase().includes(query)
      );
    }

    if (selectedRatings.length > 0) {
      filtered = filtered.filter((review) => selectedRatings.includes(review.rating));
    }

    const { start, end } = getDateRange();
    if (start || end) {
      filtered = filtered.filter((review) => {
        const reviewDate = new Date(review.created_at || '');
        if (start && reviewDate < start) return false;
        if (end && reviewDate > end) return false;
        return true;
      });
    }

    if (replyStatusFilter !== 'all') {
      filtered = filtered.filter((review) => {
        const hasReply = review.status === 'responded';
        return replyStatusFilter === 'replied' ? hasReply : !hasReply;
      });
    }

    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'date-asc':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'rating-desc':
          return b.rating - a.rating;
        case 'rating-asc':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, searchQuery, selectedRatings, dateRangePreset, customStartDate, customEndDate, replyStatusFilter, sortOption]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRatings([]);
    setDateRangePreset('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setReplyStatusFilter('all');
    setSortOption('date-desc');
    setPage(1);
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedRatings.length > 0) count++;
    if (dateRangePreset !== 'all') count++;
    if (replyStatusFilter !== 'all') count++;
    if (sortOption !== 'date-desc') count++;
    return count;
  }, [searchQuery, selectedRatings, dateRangePreset, replyStatusFilter, sortOption]);

  // Selection handlers
  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) => {
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
    const unrepliedReviews = filteredAndSortedReviews.filter(r => r.status !== 'responded');
    if (selectedReviews.size === unrepliedReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(unrepliedReviews.map(r => r.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedReviews(new Set());
    setSelectMode(false);
  };

  // Generate AI Reply for single review
  const generateAIReply = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    setGeneratingReviewId(reviewId);
    try {
      const response = await axios.post('/api/ai-reply/generate', {
        reviewId,
        tone: selectedTone,
        reviewText: review.comment,
        rating: review.rating,
        reviewerName: review.author,
      });

      const generatedReply = response.data.reply;
      setGeneratedReplies(prev => ({ ...prev, [reviewId]: generatedReply }));
      setPreviewReviewId(reviewId);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      console.error('AI返信生成エラー:', error);
      alert(error.response?.data?.error || 'AI返信の生成に失敗しました');
    } finally {
      setGeneratingReviewId(null);
    }
  };

  // Regenerate AI Reply
  const handleRegenerate = async () => {
    if (!previewReviewId) return;
    setIsRegenerating(true);
    try {
      await generateAIReply(previewReviewId);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Post reply
  const handlePostReply = async (editedReply: string) => {
    if (!previewReviewId) return;

    setPostingReviewId(previewReviewId);
    try {
      await axios.put(`/api/reviews/${previewReviewId}`, {
        status: 'responded',
        response_text: editedReply,
      });

      // Update local state
      setReviews(prev => prev.map(r =>
        r.id === previewReviewId
          ? { ...r, status: 'responded' as const }
          : r
      ));

      setPreviewDialogOpen(false);
      setPreviewReviewId(null);

      // Show celebration
      setCelebrationMessage('返信を投稿しました！');
      setShowCelebration(true);
    } catch (error) {
      console.error('返信投稿エラー:', error);
      alert('返信の投稿に失敗しました');
    } finally {
      setPostingReviewId(null);
    }
  };

  // Bulk generate AI replies
  const handleBulkGenerate = async () => {
    if (selectedReviews.size === 0) return;

    const selectedReviewList = filteredAndSortedReviews.filter(r => selectedReviews.has(r.id));

    // Initialize progress
    const initialProgress: ReviewProgress[] = selectedReviewList.map(r => ({
      reviewId: r.id,
      reviewerName: r.author || '匿名',
      status: 'pending',
    }));

    setBulkProgress(initialProgress);
    setBulkCurrentIndex(0);
    setBulkGenerating(true);

    // Process each review sequentially
    for (let i = 0; i < selectedReviewList.length; i++) {
      const review = selectedReviewList[i];

      // Update status to processing
      setBulkProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'processing' } : p
      ));
      setBulkCurrentIndex(i + 1);

      try {
        const response = await axios.post('/api/ai-reply/generate', {
          reviewId: review.id,
          tone: selectedTone,
          reviewText: review.comment,
          rating: review.rating,
          reviewerName: review.author,
        });

        const generatedReply = response.data.reply;

        // Update to success
        setBulkProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'success', generatedReply } : p
        ));

        setGeneratedReplies(prev => ({ ...prev, [review.id]: generatedReply }));
      } catch (error: any) {
        // Update to error
        setBulkProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error', error: error.response?.data?.error || 'エラー' } : p
        ));
      }

      // Small delay between requests
      if (i < selectedReviewList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Wait a bit then close dialog
    setTimeout(() => {
      setBulkGenerating(false);
      setSelectMode(false);
      setSelectedReviews(new Set());

      // Show celebration
      const successCount = bulkProgress.filter(p => p.status === 'success').length;
      if (successCount > 0) {
        setCelebrationMessage(`${successCount}件のAI返信を生成しました！`);
        setShowCelebration(true);
      }
    }, 1500);
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          レビュー管理
        </Typography>
        <Box display="flex" gap={2}>
          {selectMode ? (
            <>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={handleClearSelection}
              >
                選択解除
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleBulkGenerate}
                disabled={selectedReviews.size === 0}
              >
                一括AI返信生成 ({selectedReviews.size}件)
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              startIcon={<PlaylistAddCheckIcon />}
              onClick={() => setSelectMode(true)}
            >
              複数選択モード
            </Button>
          )}
        </Box>
      </Box>

      {/* Tone Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <ToneSelector selectedTone={selectedTone} onToneChange={setSelectedTone} />
      </Paper>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="レビュアー名やコメント内容で検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter Toggle Button */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          endIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          フィルター {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="text" size="small" onClick={handleClearFilters}>
            フィルターをクリア
          </Button>
        )}
        {selectMode && (
          <Button
            variant="text"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
          >
            未返信を全選択
          </Button>
        )}
      </Box>

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Rating Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>評価</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Chip
                    key={rating}
                    label={<Rating value={rating} readOnly size="small" />}
                    onClick={() => handleRatingToggle(rating)}
                    color={selectedRatings.includes(rating) ? 'primary' : 'default'}
                    variant={selectedRatings.includes(rating) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Grid>

            {/* Date Range Filter */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>期間</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { label: 'すべて', value: 'all' },
                  { label: '過去7日間', value: 'last7days' },
                  { label: '過去30日間', value: 'last30days' },
                ].map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    onClick={() => {
                      setDateRangePreset(option.value as DateRangePreset);
                      setPage(1);
                    }}
                    color={dateRangePreset === option.value ? 'primary' : 'default'}
                    variant={dateRangePreset === option.value ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Grid>

            {/* Reply Status Filter */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>返信ステータス</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { label: 'すべて', value: 'all' },
                  { label: '未返信', value: 'unreplied' },
                  { label: '返信済み', value: 'replied' },
                ].map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    onClick={() => {
                      setReplyStatusFilter(option.value as ReplyStatusFilter);
                      setPage(1);
                    }}
                    color={replyStatusFilter === option.value ? 'primary' : 'default'}
                    variant={replyStatusFilter === option.value ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Grid>

            {/* Sort Options */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>並び替え</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as SortOption);
                    setPage(1);
                  }}
                >
                  <MenuItem value="date-desc">日付: 新しい順</MenuItem>
                  <MenuItem value="date-asc">日付: 古い順</MenuItem>
                  <MenuItem value="rating-desc">評価: 高い順</MenuItem>
                  <MenuItem value="rating-asc">評価: 低い順</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Results Count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {filteredAndSortedReviews.length} 件のレビュー
          {activeFilterCount > 0 && ` (フィルター適用中)`}
        </Typography>
      </Box>

      {/* Reviews List */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredAndSortedReviews.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              {searchQuery || activeFilterCount > 0
                ? '条件に一致するレビューが見つかりませんでした'
                : 'レビューがありません'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredAndSortedReviews.map((review, index) => (
              <Grid item xs={12} key={review.id}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  layout
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    sx={{
                      position: 'relative',
                      border: selectedReviews.has(review.id) ? '2px solid' : '1px solid',
                      borderColor: selectedReviews.has(review.id) ? 'primary.main' : 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        {/* Checkbox for selection mode */}
                        {selectMode && review.status !== 'responded' && (
                          <Checkbox
                            checked={selectedReviews.has(review.id)}
                            onChange={() => handleSelectReview(review.id)}
                            sx={{ mt: -0.5, ml: -1 }}
                          />
                        )}

                        {/* Avatar */}
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {review.author?.charAt(0) || '?'}
                        </Avatar>

                        {/* Content */}
                        <Box flex={1}>
                          {/* Header */}
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Box>
                              <Typography variant="h6">{review.author || '匿名'}</Typography>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Rating value={review.rating} readOnly size="small" />
                                <Typography variant="caption" color="textSecondary">
                                  {review.created_at && formatDistanceToNow(new Date(review.created_at), {
                                    addSuffix: true,
                                    locale: ja
                                  })}
                                </Typography>
                              </Box>
                            </Box>
                            <Box display="flex" gap={1}>
                              {review.status === 'responded' ? (
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label="返信済み"
                                  size="small"
                                  color="success"
                                />
                              ) : (
                                <Chip label="未返信" size="small" color="warning" />
                              )}
                              {generatedReplies[review.id] && review.status !== 'responded' && (
                                <Chip
                                  icon={<AutoAwesomeIcon />}
                                  label="AI生成済み"
                                  size="small"
                                  color="info"
                                />
                              )}
                            </Box>
                          </Box>

                          {/* Review comment */}
                          <Typography sx={{ mt: 1, mb: 2 }}>{review.comment}</Typography>

                          {/* Action buttons */}
                          {review.status !== 'responded' && !selectMode && (
                            <Box display="flex" gap={2} justifyContent="flex-end">
                              {generatedReplies[review.id] ? (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={<SendIcon />}
                                  onClick={() => {
                                    setPreviewReviewId(review.id);
                                    setPreviewDialogOpen(true);
                                  }}
                                >
                                  プレビュー＆投稿
                                </Button>
                              ) : (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={generatingReviewId === review.id ? null : <AutoAwesomeIcon />}
                                  onClick={() => generateAIReply(review.id)}
                                  disabled={generatingReviewId !== null}
                                >
                                  {generatingReviewId === review.id ? (
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <motion.span
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                      >
                                        AI生成中
                                      </motion.span>
                                      <motion.span
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.5 }}
                                      >
                                        ...
                                      </motion.span>
                                    </Box>
                                  ) : (
                                    'AI返信を生成'
                                  )}
                                </Button>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {filteredAndSortedReviews.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Floating Action Button for bulk selection */}
      <Zoom in={selectMode && selectedReviews.size > 0}>
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
          onClick={handleBulkGenerate}
        >
          <Badge badgeContent={selectedReviews.size} color="error">
            <AutoAwesomeIcon />
          </Badge>
        </Fab>
      </Zoom>

      {/* AI Reply Preview Dialog */}
      {previewReviewId && (
        <AIReplyPreviewDialog
          open={previewDialogOpen}
          onClose={() => {
            setPreviewDialogOpen(false);
            setPreviewReviewId(null);
          }}
          generatedReply={generatedReplies[previewReviewId] || ''}
          reviewId={previewReviewId}
          onRegenerate={handleRegenerate}
          onPost={handlePostReply}
          isRegenerating={isRegenerating}
        />
      )}

      {/* Bulk Reply Progress Dialog */}
      <BulkReplyProgress
        open={bulkGenerating}
        reviews={bulkProgress}
        currentIndex={bulkCurrentIndex}
        totalCount={bulkProgress.length}
      />

      {/* Success Celebration */}
      <SuccessCelebration
        show={showCelebration}
        message={celebrationMessage}
        onComplete={() => setShowCelebration(false)}
      />
    </Box>
  );
};

export default ReviewManagementUltimate;
