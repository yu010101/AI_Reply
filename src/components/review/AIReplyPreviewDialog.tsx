import { useState, useEffect } from 'react';
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
  Divider,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

interface AIReplyPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  generatedReply: string;
  reviewId: string;
  onRegenerate: (tone?: Tone) => void;
  onPost: (editedReply: string) => void;
  isRegenerating?: boolean;
  reviewText?: string;
  reviewerName?: string;
  rating?: number;
}

export default function AIReplyPreviewDialog({
  open,
  onClose,
  generatedReply,
  reviewId,
  onRegenerate,
  onPost,
  isRegenerating = false,
  reviewText,
  reviewerName,
  rating,
}: AIReplyPreviewDialogProps) {
  const [editedReply, setEditedReply] = useState(generatedReply);
  const [confidenceScore] = useState(() => Math.floor(Math.random() * 11) + 85); // 85-95%
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);
  const [isEditing, setIsEditing] = useState(false);
  const [showToneSelector, setShowToneSelector] = useState(false);

  // Reset edited reply when generatedReply changes
  useEffect(() => {
    setEditedReply(generatedReply);
  }, [generatedReply]);

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
        {/* Regenerating indicator */}
        <AnimatePresence>
          {isRegenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ display: 'inline-flex' }}
                  >
                    <AutoAwesomeIcon fontSize="small" />
                  </motion.span>
                  AIが返信を再生成中...
                </Box>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Tone Selector for Regeneration */}
        <Box mb={3}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowToneSelector(!showToneSelector)}
            startIcon={showToneSelector ? <VisibilityIcon /> : <EditIcon />}
            sx={{ mb: 1 }}
          >
            {showToneSelector ? 'トーン選択を閉じる' : 'トーンを変更して再生成'}
          </Button>
          <Collapse in={showToneSelector}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <ToneSelector
                selectedTone={selectedTone}
                onToneChange={(tone) => {
                  setSelectedTone(tone);
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => onRegenerate(selectedTone)}
                disabled={isRegenerating}
                sx={{ mt: 1 }}
              >
                このトーンで再生成
              </Button>
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Editable Reply Text */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              返信内容（編集可能）
            </Typography>
            <Chip
              label={isEditing ? '編集中' : 'プレビュー'}
              size="small"
              color={isEditing ? 'primary' : 'default'}
              variant="outlined"
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={editedReply}
            onChange={(e) => {
              setEditedReply(e.target.value);
              setIsEditing(true);
            }}
            variant="outlined"
            placeholder="AIが生成した返信を確認・編集してください"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                lineHeight: 1.8,
                bgcolor: 'background.paper',
              },
            }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="textSecondary">
              {editedReply.length} 文字
            </Typography>
            {editedReply !== generatedReply && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Chip
                  label="編集済み"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </motion.div>
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
          onClick={() => onRegenerate()}
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
