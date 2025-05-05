import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Reply } from '@/types';
import axios from 'axios';

export const ReplyManagement = ({ reviewId }: { reviewId: string }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');

  const fetchReply = async () => {
    try {
      const response = await axios.get<{ data: Reply }>(`/api/replies/${reviewId}`);
      setReply(response.data.data);
    } catch (error) {
      console.error('返信の取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    fetchReply();
  }, [reviewId]);

  const handleGenerateReply = async () => {
    try {
      const response = await axios.post<{ data: Reply }>('/api/replies/generate', {
        review_id: reviewId,
      });
      setReply(response.data.data);
      setContent(response.data.data.content);
    } catch (error) {
      console.error('返信の生成に失敗しました:', error);
    }
  };

  const handleUpdateReply = async () => {
    try {
      await axios.put(`/api/replies/${reply?.id}`, {
        content,
        status: 'ready',
      });
      setOpen(false);
      fetchReply();
    } catch (error) {
      console.error('返信の更新に失敗しました:', error);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {reply ? (
        <Card>
          <CardContent>
            <Typography variant="h6">返信内容</Typography>
            <Typography sx={{ mt: 1 }}>{reply.content}</Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setContent(reply.content);
                  setOpen(true);
                }}
              >
                編集
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Button variant="contained" onClick={handleGenerateReply}>
          返信を生成
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>返信の編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="返信内容"
            fullWidth
            multiline
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>キャンセル</Button>
          <Button onClick={handleUpdateReply}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 