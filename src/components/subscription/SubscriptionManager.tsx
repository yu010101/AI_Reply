import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase';
// Stripe checkout sessionはAPI経由で作成

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  stripe_price_id: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan: Plan;
}

export default function SubscriptionManager() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // プラン情報を取得
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData);

      if (!user) return;

      // 現在のサブスクリプション情報を取得
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setSubscription(subData);
    } catch (error) {
      console.error('サブスクリプション情報取得エラー:', error);
      setError('サブスクリプション情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('プランが見つかりません');

      // Stripe checkout sessionをAPI経由で作成
      const response = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.stripe_price_id,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancel`,
          metadata: {
            userId: user?.id || '',
            planId: plan.id,
          },
        }),
      });
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('チェックアウトセッションの作成に失敗しました');
      }
    } catch (error) {
      console.error('サブスクリプション作成エラー:', error);
      setError('サブスクリプションの作成に失敗しました');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      if (!subscription) return;

      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      setSubscription({
        ...subscription,
        cancel_at_period_end: true,
      });
      setShowCancelDialog(false);
    } catch (error) {
      console.error('サブスクリプションキャンセルエラー:', error);
      setError('サブスクリプションのキャンセルに失敗しました');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        サブスクリプション管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {subscription ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              現在のプラン: {subscription.plan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ステータス: {subscription.status}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              次回更新日: {new Date(subscription.current_period_end).toLocaleDateString()}
            </Typography>
            {subscription.cancel_at_period_end && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                このサブスクリプションは期間終了時にキャンセルされます
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
                disabled={subscription.cancel_at_period_end}
              >
                キャンセル
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Typography variant="body1" gutterBottom>
          現在アクティブなサブスクリプションはありません
        </Typography>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        利用可能なプラン
      </Typography>

      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="h4" gutterBottom>
                  ¥{plan.price.toLocaleString()}/月
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {plan.features.map((feature, index) => (
                    <Typography key={index} variant="body2" gutterBottom>
                      • {feature}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscription?.plan.id === plan.id}
                  >
                    {subscription?.plan.id === plan.id ? '現在のプラン' : '選択する'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>サブスクリプションのキャンセル</DialogTitle>
        <DialogContent>
          <Typography>
            本当にサブスクリプションをキャンセルしますか？
            現在の期間が終了するまでサービスは利用可能です。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>キャンセル</Button>
          <Button onClick={handleCancelSubscription} color="error">
            キャンセルする
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 