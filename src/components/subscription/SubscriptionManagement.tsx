import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '@/types';
import axios from 'axios';

export const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [formData, setFormData] = useState<CreateSubscriptionRequest>({
    plan: 'free',
  });

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await axios.get<{ data: Subscription }>('/api/subscriptions');
      setSubscription(response.data.data);
    } catch (error) {
      console.error('サブスクリプションの取得に失敗しました:', error);
    }
  };

  const handleCreateSubscription = async () => {
    try {
      await axios.post<{ data: Subscription }>('/api/subscriptions', formData);
      setOpen(false);
      setFormData({ plan: 'free' });
      fetchSubscription();
    } catch (error) {
      console.error('サブスクリプションの作成に失敗しました:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await axios.delete('/api/subscriptions');
      fetchSubscription();
    } catch (error) {
      console.error('サブスクリプションのキャンセルに失敗しました:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        サブスクリプション管理
      </Typography>

      {subscription ? (
        <Card>
          <CardContent>
            <Typography variant="h6">現在のプラン: {subscription.plan}</Typography>
            <Typography color="textSecondary">
              ステータス: {subscription.status}
            </Typography>
            <Typography color="textSecondary">
              有効期間: {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpen(true)}
                sx={{ mr: 2 }}
              >
                プラン変更
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleCancelSubscription}
              >
                キャンセル
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Button variant="contained" onClick={() => setOpen(true)}>
          新規サブスクリプション作成
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {subscription ? 'プラン変更' : '新規サブスクリプション作成'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="プラン"
            fullWidth
            value={formData.plan}
            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>キャンセル</Button>
          <Button onClick={handleCreateSubscription}>
            {subscription ? '変更' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 