import React from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

interface BulkActionBarProps {
  selectedCount: number;
  onGenerateBulk: () => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onGenerateBulk,
  onCancel,
  isGenerating = false,
}) => {
  return (
    <Slide direction="up" in={selectedCount > 0} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderRadius: 0,
          borderTop: '2px solid',
          borderColor: 'primary.main',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            maxWidth: 1200,
            mx: 'auto',
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              size="small"
              onClick={onCancel}
              disabled={isGenerating}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="bold">
              {selectedCount}件選択中
            </Typography>
            <Typography variant="body2" color="textSecondary">
              選択したレビューに一括でAI返信を生成します
            </Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={isGenerating}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AutoAwesomeIcon />}
              onClick={onGenerateBulk}
              disabled={isGenerating || selectedCount === 0}
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              一括AI返信生成
            </Button>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );
};
