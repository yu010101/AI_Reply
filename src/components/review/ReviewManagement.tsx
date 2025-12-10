/**
 * World-Class Review Management
 *
 * Design Principles:
 * - Clear, scannable review list
 * - Powerful but simple filtering
 * - Quick action buttons
 * - Accessible and responsive
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Rating,
  Paper,
  Collapse,
  Container,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircleOutline,
  AccessTime,
  DoNotDisturb,
} from '@mui/icons-material';
import { Review } from '@/types';
import axios from 'axios';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type SortOption = 'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc';
type DateRangePreset = 'all' | 'last7days' | 'last30days';
type ReplyStatusFilter = 'all' | 'replied' | 'unreplied';

export const ReviewManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [status, setStatus] = useState<string>('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [replyStatusFilter, setReplyStatusFilter] = useState<ReplyStatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (status) params.append('status', status);

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
  }, [page, limit, status]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStatusChange = useCallback(
    async (reviewId: string, newStatus: string) => {
      try {
        await axios.put(`/api/reviews/${reviewId}`, { status: newStatus });
        fetchReviews();
      } catch (error) {
        console.error('レビューの更新に失敗しました:', error);
      }
    },
    [fetchReviews]
  );

  const handleRatingToggle = useCallback((rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
    setPage(1);
  }, []);

  const getDateRange = useCallback((): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'last7days':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case 'last30days':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
      default:
        return { start: null, end: null };
    }
  }, [dateRangePreset]);

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
  }, [reviews, searchQuery, selectedRatings, getDateRange, replyStatusFilter, sortOption]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedRatings([]);
    setDateRangePreset('all');
    setReplyStatusFilter('all');
    setSortOption('date-desc');
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedRatings.length > 0) count++;
    if (dateRangePreset !== 'all') count++;
    if (replyStatusFilter !== 'all') count++;
    if (sortOption !== 'date-desc') count++;
    return count;
  }, [searchQuery, selectedRatings, dateRangePreset, replyStatusFilter, sortOption]);

  const getStatusIcon = (reviewStatus: string): React.ReactElement | undefined => {
    switch (reviewStatus) {
      case 'responded':
        return <CheckCircleOutline sx={{ fontSize: 16 }} />;
      case 'pending':
        return <AccessTime sx={{ fontSize: 16 }} />;
      case 'ignored':
        return <DoNotDisturb sx={{ fontSize: 16 }} />;
      default:
        return undefined;
    }
  };

  const getStatusColor = (reviewStatus: string): 'success' | 'warning' | 'default' => {
    switch (reviewStatus) {
      case 'responded':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (reviewStatus: string) => {
    switch (reviewStatus) {
      case 'responded':
        return '返信済み';
      case 'pending':
        return '未返信';
      case 'ignored':
        return '無視';
      default:
        return reviewStatus;
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <LoadingSpinner size="lg" label="レビューを読み込み中..." />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 500, letterSpacing: '-0.02em', mb: 1 }}
        >
          レビュー管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          すべてのレビューを確認し、返信を管理できます
        </Typography>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="レビュアー名やコメントで検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Filter Toggle */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          endIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowFilters(!showFilters)}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          フィルター{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        {activeFilterCount > 0 && (
          <Button
            variant="text"
            size="small"
            onClick={handleClearFilters}
            sx={{ textTransform: 'none' }}
          >
            クリア
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {filteredAndSortedReviews.length}件のレビュー
        </Typography>
      </Box>

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
          elevation={0}
        >
          <Grid container spacing={3}>
            {/* Rating Filter */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 500, color: 'text.secondary' }}
              >
                評価
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Chip
                    key={rating}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={rating} readOnly size="small" />
                      </Box>
                    }
                    onClick={() => handleRatingToggle(rating)}
                    color={selectedRatings.includes(rating) ? 'primary' : 'default'}
                    variant={selectedRatings.includes(rating) ? 'filled' : 'outlined'}
                    sx={{ borderRadius: 1.5 }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Date Range & Reply Status */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 500, color: 'text.secondary' }}
              >
                期間
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'last7days', label: '過去7日' },
                  { value: 'last30days', label: '過去30日' },
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
                    sx={{ borderRadius: 1.5 }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 500, color: 'text.secondary' }}
              >
                返信ステータス
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'unreplied', label: '未返信' },
                  { value: 'replied', label: '返信済み' },
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
                    sx={{ borderRadius: 1.5 }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Sort */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 500, color: 'text.secondary' }}
              >
                並び替え
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as SortOption);
                    setPage(1);
                  }}
                  sx={{ borderRadius: 1.5 }}
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

      {/* Reviews List */}
      {filteredAndSortedReviews.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          title={activeFilterCount > 0 ? '条件に一致するレビューがありません' : 'レビューがありません'}
          description={
            activeFilterCount > 0
              ? 'フィルター条件を変更してみてください'
              : 'Google Business Profileを連携してレビューを取得しましょう'
          }
          actionLabel={activeFilterCount > 0 ? 'フィルターをクリア' : undefined}
          onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
          variant="card"
        />
      ) : (
        <Grid container spacing={2}>
          {filteredAndSortedReviews.map((review) => (
            <Grid item xs={12} key={review.id}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: 'text.disabled',
                  },
                }}
                elevation={0}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 500, mb: 0.5 }}
                      >
                        {review.author}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Rating
                          value={review.rating}
                          readOnly
                          size="small"
                          sx={{
                            '& .MuiRating-iconFilled': {
                              color: '#FBBF24',
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {review.created_at &&
                            new Date(review.created_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={getStatusIcon(review.status)}
                      label={getStatusLabel(review.status)}
                      size="small"
                      color={getStatusColor(review.status)}
                      sx={{ borderRadius: 1.5, fontWeight: 500 }}
                    />
                  </Box>

                  {/* Comment */}
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.7,
                      color: 'text.secondary',
                      mb: 3,
                    }}
                  >
                    {review.comment}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant={review.status === 'responded' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleStatusChange(review.id, 'responded')}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      対応済み
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleStatusChange(review.id, 'ignored')}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      無視
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {filteredAndSortedReviews.length > 0 && total > limit && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(_, value) => setPage(value)}
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 1.5,
              },
            }}
          />
        </Box>
      )}
    </Container>
  );
};
