import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Grid, Alert, Card, CardContent, CardActions, Divider } from '@mui/material';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice, createCustomerPortalLink } from '@/utils/stripe';
import { Plan, PLAN_LIMITS, PLAN_PRICES, PlanLimits } from '@/constants/plan';

interface Subscription {
  id: string;
  tenant_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: Plan;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

interface UsageMetric {
  id: string;
  tenant_id: string;
  metric_name: string;
  count: number;
  month: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchUsageMetrics();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('サブスクリプション取得エラー:', error);
      } else {
        setSubscription(data);
      }
    } catch (err) {
      console.error('サブスクリプション取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('使用量メトリクス取得エラー:', error);
      } else {
        setUsageMetrics(data || []);
      }
    } catch (err) {
      console.error('使用量メトリクス取得エラー:', err);
    }
  };

  const handleCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      setError(null);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', user?.id)
        .single();

      if (!tenant?.stripe_customer_id) {
        setError('Stripe顧客IDが見つかりません');
        return;
      }

      const { url, error } = await createCustomerPortalLink(tenant.stripe_customer_id);
      
      if (error) {
        setError('ポータルリンクの生成に失敗しました');
        return;
      }

      // ポータルページにリダイレクト
      window.location.href = url;
    } catch (err) {
      console.error('顧客ポータルエラー:', err);
      setError('顧客ポータルの読み込みに失敗しました');
    } finally {
      setPortalLoading(false);
    }
  };

  // 使用量の取得
  const getUsage = (metricName: string) => {
    const metric = usageMetrics.find(m => m.metric_name === metricName);
    return metric ? metric.count : 0;
  };

  // プランの取得
  const getCurrentPlan = (): Plan => {
    return (subscription?.plan || 'free') as Plan;
  };

  const planLimits = PLAN_LIMITS[getCurrentPlan()];

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            アカウント請求情報
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      現在のプラン
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" component="span">
                        {getCurrentPlan().charAt(0).toUpperCase() + getCurrentPlan().slice(1)}プラン
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        料金: {formatPrice(getCurrentPlan())} / 月
                      </Typography>
                      {subscription && (
                        <Typography variant="body2" color="text.secondary">
                          ステータス: {subscription.status === 'active' ? '有効' : '無効'}
                        </Typography>
                      )}
                      {subscription?.current_period_end && (
                        <Typography variant="body2" color="text.secondary">
                          次回請求日: {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" justifyContent="flex-end">
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCustomerPortal}
                        disabled={portalLoading || !subscription?.stripe_customer_id}
                        sx={{ mr: 1 }}
                      >
                        {portalLoading ? <CircularProgress size={24} /> : '請求設定を管理'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        href="/subscription-history"
                      >
                        請求履歴を表示
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      使用状況
                    </Typography>
                    <Box>
                      <Typography variant="body2">
                        店舗数: {getUsage('location')} / {planLimits.maxLocations}
                      </Typography>
                      <Typography variant="body2">
                        レビュー取得数: {getUsage('review')} / {planLimits.maxReviewsPerMonth}
                      </Typography>
                      <Typography variant="body2">
                        AI返信生成数: {getUsage('ai_reply')} / {planLimits.maxAIRepliesPerMonth}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    利用可能なプラン
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(PLAN_LIMITS).map(([plan, limits]) => (
                      <Grid item xs={12} sm={6} md={3} key={plan}>
                        <Card 
                          variant="outlined" 
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: getCurrentPlan() === plan ? 'primary.50' : 'inherit',
                            border: getCurrentPlan() === plan ? '1px solid' : 'inherit',
                            borderColor: getCurrentPlan() === plan ? 'primary.main' : 'inherit',
                          }}
                        >
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" component="div">
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}プラン
                            </Typography>
                            <Typography variant="h5" component="div" color="primary" gutterBottom>
                              {formatPrice(plan as Plan)} / 月
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              店舗数: {(limits as PlanLimits).maxLocations}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              レビュー取得数: {(limits as PlanLimits).maxReviewsPerMonth} / 月
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              AI返信生成数: {(limits as PlanLimits).maxAIRepliesPerMonth} / 月
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" component="div">
                              <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                                {(limits as PlanLimits).features.map((feature: string, index: number) => (
                                  <li key={index}>{feature}</li>
                                ))}
                              </ul>
                            </Typography>
                          </CardContent>
                          <CardActions>
                            <Button 
                              size="small" 
                              color="primary"
                              variant={getCurrentPlan() === plan ? 'outlined' : 'contained'}
                              fullWidth
                              disabled={getCurrentPlan() === plan || portalLoading}
                              onClick={handleCustomerPortal}
                            >
                              {getCurrentPlan() === plan ? '現在のプラン' : 'プラン変更'}
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 