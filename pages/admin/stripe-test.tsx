import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { supabase } from '@/utils/supabase';
import axios from 'axios';

// Stripeテスト用ページ
export default function StripeTestPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);

  // ユーザーの組織と利用可能なプランを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 組織の取得
        const { data: orgData, error: orgError } = await supabase
          .from('organization_users')
          .select(`
            organizations:organization_id(
              id, name, display_name
            )
          `);

        if (orgError) {
          console.error('組織取得エラー:', orgError);
          return;
        }

        const orgs = orgData.map((item: any) => item.organizations);
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }

        // プランの取得
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('monthly_price', { ascending: true });

        if (planError) {
          console.error('プラン取得エラー:', planError);
          return;
        }

        setPlans(planData);
        if (planData.length > 0) {
          setSelectedPlanId(planData[0].id);
        }

        // Webhook ログの取得
        const { data: logData, error: logError } = await supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!logError && logData) {
          setWebhookLogs(logData);
        }
      } catch (err) {
        console.error('データ取得エラー:', err);
      }
    };

    fetchData();
    fetchSubscriptions();
  }, []);

  // サブスクリプション一覧を取得
  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          organization:organization_id(name, display_name),
          plan:plan_id(name, monthly_price, annual_price)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('サブスクリプション取得エラー:', error);
        return;
      }

      setSubscriptions(data || []);
    } catch (err) {
      console.error('サブスクリプション取得エラー:', err);
    }
  };

  // チェックアウトセッションの作成
  const createCheckoutSession = async () => {
    if (!selectedOrgId || !selectedPlanId) {
      setError('組織とプランを選択してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/subscriptions/upgrade', {
        organizationId: selectedOrgId,
        planId: selectedPlanId,
        billingCycle
      });

      if (response.data.url) {
        setSuccess('チェックアウトURLが作成されました');
        window.open(response.data.url, '_blank');
      } else {
        setError('チェックアウトURLの取得に失敗しました');
      }
    } catch (err: any) {
      console.error('チェックアウトエラー:', err);
      setError(err.response?.data?.error || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // サブスクリプションをキャンセル
  const cancelSubscription = async (subscriptionId: string, organizationId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/subscriptions/cancel', {
        subscriptionId,
        organizationId,
        cancelAtPeriodEnd: true
      });

      setSuccess('サブスクリプションがキャンセルされました');
      fetchSubscriptions();
    } catch (err: any) {
      console.error('キャンセルエラー:', err);
      setError(err.response?.data?.error || 'キャンセルに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Webhookテストイベントを送信
  const sendTestWebhook = async (eventType: string) => {
    setWebhookTestLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // このエンドポイントはまだ実装されていないので、必要に応じて作成してください
      const response = await axios.post('/api/admin/test-webhook', {
        eventType
      });

      setSuccess(`${eventType} イベントを送信しました`);
      
      // Webhook ログを再取得
      const { data: logData } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logData) {
        setWebhookLogs(logData);
      }
    } catch (err: any) {
      console.error('Webhookテストエラー:', err);
      setError(err.response?.data?.error || 'Webhookテストに失敗しました');
    } finally {
      setWebhookTestLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Stripe連携テスト
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* サブスクリプション作成テスト */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  サブスクリプション作成テスト
                </Typography>

                <Box component="form" sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>組織</InputLabel>
                    <Select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value as string)}
                      label="組織"
                    >
                      {organizations.map((org) => (
                        <MenuItem key={org.id} value={org.id}>
                          {org.display_name || org.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>プラン</InputLabel>
                    <Select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                      label="プラン"
                    >
                      {plans.map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.name} (¥{plan.monthly_price}/月)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>請求サイクル</InputLabel>
                    <Select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                      label="請求サイクル"
                    >
                      <MenuItem value="monthly">月額</MenuItem>
                      <MenuItem value="annual">年額</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    onClick={createCheckoutSession}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'チェックアウトセッション作成'}
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Webhookテスト */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Webhookテスト
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  注意: これは開発環境でのみ機能します。テストイベントを送信して Stripe Webhook の処理をテストします。
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => sendTestWebhook('checkout.session.completed')}
                      disabled={webhookTestLoading}
                    >
                      checkout.session.completed
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => sendTestWebhook('invoice.payment_succeeded')}
                      disabled={webhookTestLoading}
                    >
                      invoice.payment_succeeded
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => sendTestWebhook('customer.subscription.updated')}
                      disabled={webhookTestLoading}
                    >
                      customer.subscription.updated
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => sendTestWebhook('customer.subscription.deleted')}
                      disabled={webhookTestLoading}
                    >
                      customer.subscription.deleted
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 最近のサブスクリプション */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  最近のサブスクリプション
                </Typography>

                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mb: 2 }}
                  onClick={fetchSubscriptions}
                >
                  更新
                </Button>

                <Grid container spacing={2}>
                  {subscriptions.map((subscription) => (
                    <Grid item xs={12} sm={6} md={4} key={subscription.id}>
                      <Card>
                        <CardHeader
                          title={subscription.organization?.display_name || subscription.organization?.name || '不明な組織'}
                          subheader={`プラン: ${subscription.plan?.name || '不明'}`}
                          action={
                            <Chip
                              label={subscription.status}
                              color={subscription.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          }
                        />
                        <CardContent>
                          <List dense>
                            <ListItem>
                              <ListItemText
                                primary="請求サイクル"
                                secondary={subscription.billing_cycle === 'monthly' ? '月額' : '年額'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="期間"
                                secondary={`${new Date(subscription.current_period_start).toLocaleDateString()} - ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="終了予定"
                                secondary={subscription.cancel_at_period_end ? 'はい' : 'いいえ'}
                              />
                            </ListItem>
                          </List>
                          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => cancelSubscription(subscription.id, subscription.organization_id)}
                              fullWidth
                              sx={{ mt: 1 }}
                            >
                              キャンセル
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {subscriptions.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    サブスクリプションがありません
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Webhook ログ */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  最近のWebhookログ
                </Typography>

                {webhookLogs.length > 0 ? (
                  <List>
                    {webhookLogs.map((log) => (
                      <ListItem key={log.id} divider>
                        <ListItemText
                          primary={log.event_type}
                          secondary={
                            <>
                              <Typography variant="body2" component="span">
                                {new Date(log.created_at).toLocaleString()}
                              </Typography>
                              <br />
                              <Typography variant="body2" component="span" color={log.success ? 'success.main' : 'error.main'}>
                                {log.success ? '成功' : '失敗'} 
                                {log.error && ` - ${log.error}`}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Webhookログがありません
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 