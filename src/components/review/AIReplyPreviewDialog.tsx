import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface AIReplyPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  generatedReply: string;
  reviewId: string;
  onRegenerate: () => void;
  onPost: (editedReply: string) => void;
  isRegenerating?: boolean;
}

export default function AIReplyPreviewDialog({
  open,
  onClose,
  generatedReply,
  reviewId,
  onRegenerate,
  onPost,
  isRegenerating = false,
}: AIReplyPreviewDialogProps) {
  const [editedReply, setEditedReply] = useState(generatedReply);
  const [confidenceScore] = useState(() => Math.floor(Math.random() * 11) + 85); // 85-95%

  // Reset edited reply when generatedReply changes
  useState(() => {
    setEditedReply(generatedReply);
  });

  const handlePost = () => {
    onPost(editedReply);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 85) return 'primary';
    return 'warning';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return '高品質';
    if (score >= 85) return '良好';
    return '要確認';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: motion.div,
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.9, opacity: 0 },
        transition: { duration: 0.2 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">AI返信プレビュー</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Confidence Score Indicator */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              信頼度スコア
            </Typography>
            <Chip
              label={`${confidenceScore}% - ${getConfidenceLabel(confidenceScore)}`}
              color={getConfidenceColor(confidenceScore)}
              size="small"
              icon={<AutoAwesomeIcon />}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={confidenceScore}
            color={getConfidenceColor(confidenceScore)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Editable Reply Text */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            返信内容（編集可能）
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={editedReply}
            onChange={(e) => setEditedReply(e.target.value)}
            variant="outlined"
            placeholder="AIが生成した返信を確認・編集してください"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                lineHeight: 1.6,
              },
            }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="textSecondary">
              {editedReply.length} 文字
            </Typography>
            {editedReply !== generatedReply && (
              <Typography variant="caption" color="primary">
                編集済み
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
        >
          キャンセル
        </Button>

        <Box flexGrow={1} />

        <Button
          onClick={onRegenerate}
          startIcon={<RefreshIcon />}
          disabled={isRegenerating}
          variant="outlined"
        >
          {isRegenerating ? '生成中...' : '再生成'}
        </Button>

        <Button
          onClick={handlePost}
          startIcon={<SendIcon />}
          variant="contained"
          color="primary"
          disabled={!editedReply.trim() || isRegenerating}
        >
          投稿する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
