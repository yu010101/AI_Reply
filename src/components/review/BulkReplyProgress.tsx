import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ReviewProgress {
  reviewId: string;
  reviewerName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface BulkReplyProgressProps {
  open: boolean;
  reviews: ReviewProgress[];
  currentIndex: number;
  totalCount: number;
  onClose?: () => void;
}

export const BulkReplyProgress: React.FC<BulkReplyProgressProps> = ({
  open,
  reviews,
  currentIndex,
  totalCount,
  onClose,
}) => {
  const progress = totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;
  const successCount = reviews.filter(r => r.status === 'success').length;
  const errorCount = reviews.filter(r => r.status === 'error').length;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            AI返信を一括生成中...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {currentIndex} / {totalCount}件
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="textSecondary">
              進捗状況
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
        </Box>

        <Box mb={3}>
          <Box display="flex" gap={3}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                成功
              </Typography>
              <Typography variant="h6" color="success.main">
                {successCount}件
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                失敗
              </Typography>
              <Typography variant="h6" color="error.main">
                {errorCount}件
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                残り
              </Typography>
              <Typography variant="h6">
                {totalCount - currentIndex}件
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <List dense>
            {reviews.map((review, index) => (
              <ListItem
                key={review.reviewId}
                sx={{
                  bgcolor: review.status === 'processing' ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>
                  {review.status === 'pending' && (
                    <HourglassEmptyIcon color="disabled" />
                  )}
                  {review.status === 'processing' && (
                    <CircularProgress size={24} />
                  )}
                  {review.status === 'success' && (
                    <CheckCircleIcon color="success" />
                  )}
                  {review.status === 'error' && (
                    <ErrorIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={review.reviewerName}
                  secondary={
                    review.status === 'error'
                      ? review.error || 'エラーが発生しました'
                      : review.status === 'processing'
                      ? '生成中...'
                      : review.status === 'success'
                      ? '生成完了'
                      : '待機中'
                  }
                  secondaryTypographyProps={{
                    color: review.status === 'error' ? 'error' : 'textSecondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {currentIndex === totalCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Box mt={3} p={2} bgcolor="success.light" borderRadius={1}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <AutoAwesomeIcon color="success" />
                </motion.div>
                <Typography variant="body1" color="success.dark" fontWeight="bold">
                  すべての返信生成が完了しました！
                </Typography>
              </Box>
              <Typography variant="body2" color="success.dark">
                {successCount}件の返信を確認して投稿してください
              </Typography>
            </Box>
          </motion.div>
        )}
      </DialogContent>
      {currentIndex === totalCount && onClose && (
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            fullWidth
          >
            確認して投稿する
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
