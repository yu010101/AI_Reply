import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Divider,
  List,
  ListItem,
  Avatar,
  Rating,
  Alert,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GeneratedReply {
  reviewId: string;
  reply: string;
  success: boolean;
  error?: string;
}

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

interface BulkReplyReviewProps {
  open: boolean;
  generatedReplies: GeneratedReply[];
  reviews: Review[];
  onClose: () => void;
  onPostAll: (replies: { reviewId: string; reply: string }[]) => Promise<void>;
  onRegenerate: (reviewId: string) => Promise<void>;
}

export const BulkReplyReview: React.FC<BulkReplyReviewProps> = ({
  open,
  generatedReplies,
  reviews,
  onClose,
  onPostAll,
  onRegenerate,
}) => {
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const successReplies = generatedReplies.filter(r => r.success);
  const failedReplies = generatedReplies.filter(r => !r.success);

  const getReplyText = (reviewId: string): string => {
    if (editedReplies[reviewId] !== undefined) {
      return editedReplies[reviewId];
    }
    const generated = generatedReplies.find(r => r.reviewId === reviewId);
    return generated?.reply || '';
  };

  const handleEdit = (reviewId: string) => {
    setEditingId(reviewId);
    const currentReply = getReplyText(reviewId);
    setEditedReplies(prev => ({ ...prev, [reviewId]: currentReply }));
  };

  const handleSaveEdit = (reviewId: string) => {
    setEditingId(null);
  };

  const handleCancelEdit = (reviewId: string) => {
    setEditingId(null);
    const generated = generatedReplies.find(r => r.reviewId === reviewId);
    if (generated) {
      setEditedReplies(prev => {
        const newEdited = { ...prev };
        delete newEdited[reviewId];
        return newEdited;
      });
    }
  };

  const handleReplyChange = (reviewId: string, value: string) => {
    setEditedReplies(prev => ({ ...prev, [reviewId]: value }));
  };

  const handleRegenerate = async (reviewId: string) => {
    setRegenerating(reviewId);
    try {
      await onRegenerate(reviewId);
      // 再生成後は編集状態をクリア
      setEditedReplies(prev => {
        const newEdited = { ...prev };
        delete newEdited[reviewId];
        return newEdited;
      });
    } finally {
      setRegenerating(null);
    }
  };

  const handlePostAll = async () => {
    setPosting(true);
    try {
      const repliesToPost = successReplies.map(reply => ({
        reviewId: reply.reviewId,
        reply: getReplyText(reply.reviewId),
      }));
      await onPostAll(repliesToPost);
      onClose();
    } finally {
      setPosting(false);
    }
  };

  const getReviewById = (reviewId: string): Review | undefined => {
    return reviews.find(r => r.id === reviewId);
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      onClose={posting ? undefined : onClose}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            生成された返信を確認
          </Typography>
          <IconButton onClick={onClose} disabled={posting}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={3}>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              {successReplies.length}件の返信を生成しました
            </Typography>
            <Typography variant="body2">
              内容を確認して、必要に応じて編集してください
            </Typography>
          </Alert>

          {failedReplies.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" fontWeight="bold">
                {failedReplies.length}件の返信生成に失敗しました
              </Typography>
            </Alert>
          )}
        </Box>

        <Box
          sx={{
            maxHeight: 500,
            overflow: 'auto',
          }}
        >
          <List sx={{ p: 0 }}>
            {successReplies.map((generatedReply, index) => {
              const review = getReviewById(generatedReply.reviewId);
              if (!review) return null;

              const isEditing = editingId === review.id;
              const replyText = getReplyText(review.id);

              return (
                <React.Fragment key={review.id}>
                  {index > 0 && <Divider sx={{ my: 2 }} />}
                  <ListItem sx={{ px: 0, py: 2, alignItems: 'flex-start', flexDirection: 'column' }}>
                    <Box width="100%" mb={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar
                          src={review.reviewer_avatar}
                          alt={review.reviewer_name}
                          sx={{ mr: 2, width: 40, height: 40 }}
                        >
                          {review.reviewer_name?.charAt(0) || '?'}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {review.reviewer_name || '匿名ユーザー'}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Rating value={review.rating} readOnly size="small" />
                            <Typography variant="caption" color="textSecondary">
                              {formatDistanceToNow(new Date(review.review_date), {
                                addSuffix: true,
                                locale: ja
                              })}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          size="small"
                          label={editedReplies[review.id] ? '編集済み' : '生成済み'}
                          color={editedReplies[review.id] ? 'warning' : 'success'}
                          icon={<CheckCircleIcon />}
                        />
                      </Box>

                      <Box bgcolor="grey.50" p={2} borderRadius={1} mb={2}>
                        <Typography variant="body2">
                          {review.comment || <em>コメントなし</em>}
                        </Typography>
                      </Box>
                    </Box>

                    <Card variant="outlined" sx={{ width: '100%', bgcolor: 'background.paper' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary">
                            あなたの返信
                          </Typography>
                          <Box display="flex" gap={1}>
                            {!isEditing && (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRegenerate(review.id)}
                                  disabled={regenerating === review.id}
                                  title="再生成"
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(review.id)}
                                  title="編集"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>

                        {isEditing ? (
                          <Box>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              variant="outlined"
                              value={replyText}
                              onChange={(e) => handleReplyChange(review.id, e.target.value)}
                              sx={{ mb: 1 }}
                            />
                            <Box display="flex" justifyContent="flex-end" gap={1}>
                              <Button
                                size="small"
                                onClick={() => handleCancelEdit(review.id)}
                              >
                                キャンセル
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSaveEdit(review.id)}
                              >
                                保存
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" whiteSpace="pre-wrap">
                            {replyText}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={posting}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SendIcon />}
          onClick={handlePostAll}
          disabled={posting || successReplies.length === 0}
          sx={{ px: 4 }}
        >
          {posting ? '投稿中...' : `すべて投稿（${successReplies.length}件）`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
