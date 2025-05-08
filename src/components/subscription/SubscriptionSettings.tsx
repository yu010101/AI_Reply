import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/router';
import PlanUpgradeModal from './PlanUpgradeModal';
import { SubscriptionPlan } from '@/models/SubscriptionPlan';
import { Subscription } from '@/models/Subscription';
import { Organization } from '@/models/Organization';
import axios from 'axios';

// サブスクリプション管理コンポーネント
const SubscriptionSettings = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [cancelResult, setCancelResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 組織情報と現在のサブスクリプション情報を取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // ユーザーの組織情報を取得
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('認証セッションが見つかりません');
        }

        // ユーザーの組織一覧を取得
        const { data: orgData, error: orgError } = await supabase
          .from('organization_users')
          .select(`
            organizations:organization_id(
              id, name, display_name,
              subscriptions(
                id, plan_id, status, billing_cycle, current_period_start, current_period_end,
                cancel_at_period_end, subscription_plan:plan_id(*)
              )
            )
          `)
          .eq('user_id', session.user.id)
          .eq('is_primary', true)
          .single();

        if (orgError) {
          throw new Error(`組織情報の取得に失敗しました: ${orgError.message}`);
        }

        if (!orgData?.organizations) {
          throw new Error('組織情報が見つかりません');
        }

        // 組織情報を設定
        const org = orgData.organizations as unknown as Organization;
        setOrganization(org);

        // サブスクリプション情報を設定
        const subs = (orgData.organizations as any).subscriptions;
        if (Array.isArray(subs) && subs.length > 0) {
          const activeSub = subs.find((s: any) => s.status === 'active') || subs[0];
          setSubscription(activeSub);
          setCurrentPlan(activeSub.subscription_plan);
        }

        // 全プラン情報を取得
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('monthly_price', { ascending: true });

        if (plansError) {
          throw new Error(`プラン情報の取得に失敗しました: ${plansError.message}`);
        }

        setAllPlans(plansData);
      } catch (error) {
        console.error('データ取得エラー:', error);
        setError(error instanceof Error ? error.message : '情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // プランアップグレードモーダルを開く
  const handleOpenUpgradeModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setUpgradeModalOpen(true);
  };

  // プランアップグレードモーダルを閉じる
  const handleCloseUpgradeModal = () => {
    setUpgradeModalOpen(false);
  };

  // ダイアログを開く
  const handleOpenCancelDialog = () => {
    setCancelDialogOpen(true);
  };

  // ダイアログを閉じる
  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
  };

  // サブスクリプションのキャンセル
  const handleCancelSubscription = async () => {
    if (!subscription || !organization) return;

    try {
      setCancelLoading(true);
      
      const response = await axios.post('/api/subscriptions/cancel', {
        subscriptionId: subscription.id,
        organizationId: organization.id,
        cancelAtPeriodEnd
      });
      
      setCancelResult({
        success: true,
        message: response.data.message
      });

      // 現在のサブスクリプション情報を更新
      if (cancelAtPeriodEnd) {
        setSubscription({
          ...subscription,
          cancel_at_period_end: true
        });
      } else {
        setSubscription({
          ...subscription,
          status: 'canceled'
        });
      }

      // ダイアログを閉じる
      handleCloseCancelDialog();
    } catch (err: any) {
      console.error('サブスクリプションキャンセルエラー:', err);
      setCancelResult({
        success: false,
        message: err.response?.data?.error || 'キャンセル処理中にエラーが発生しました'
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // プラン比較表を表示するためのヘルパー関数
  const renderFeatureComparison = (feature: string, plans: SubscriptionPlan[]) => {
    return plans.map((plan) => {
      const hasFeature = plan.features[feature] === true;
      return (
        <Grid item xs={12 / plans.length} key={`${plan.id}-${feature}`} sx={{ textAlign: 'center' }}>
          {hasFeature ? (
            <CheckIcon sx={{ color: 'success.main' }} />
          ) : (
            <CloseIcon sx={{ color: 'text.disabled' }} />
          )}
        </Grid>
      );
    });
  };

  // 月額料金のフォーマット関数
  const formatPrice = (price: number) => {
    return price === 0 ? '無料' : `¥${price.toLocaleString()}`;
  };

  // 年間割引率を計算
  const calculateAnnualDiscount = (plan: SubscriptionPlan) => {
    if (plan.monthly_price === 0) return 0;
    const monthlyTotal = plan.monthly_price * 12;
    const annualTotal = plan.annual_price;
    return Math.round((1 - (annualTotal / monthlyTotal)) * 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>エラーが発生しました</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        サブスクリプション管理
      </Typography>

      {/* 現在のプラン情報 */}
      {subscription && currentPlan && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              現在のプラン: {currentPlan.name}
            </Typography>
            <Chip 
              label={subscription.status === 'active' ? '有効' : '無効'} 
              color={subscription.status === 'active' ? 'success' : 'error'} 
              size="small" 
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            請求サイクル: {subscription.billing_cycle === 'monthly' ? '月次' : '年次'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            有効期間: {new Date(subscription.current_period_start).toLocaleDateString()} から {new Date(subscription.current_period_end).toLocaleDateString()} まで
          </Typography>

          {subscription.cancel_at_period_end && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              このサブスクリプションは現在の期間終了時にキャンセルされる予定です。
            </Alert>
          )}

          <Box mt={2}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => router.push('/subscription-history')}
              sx={{ mr: 2 }}
            >
              請求履歴を表示
            </Button>
            
            {subscription.status === 'active' && !subscription.cancel_at_period_end && (
              <Button 
                variant="outlined" 
                color="error"
                onClick={handleOpenCancelDialog}
              >
                プランをキャンセル
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* プラン比較テーブル */}
      <Typography variant="h6" gutterBottom>
        利用可能なプラン
      </Typography>
      
      <Grid container spacing={3} mb={4}>
        {allPlans.map((plan) => (
          <Grid item xs={12} sm={6} md={3} key={plan.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: currentPlan?.id === plan.id ? '2px solid' : 'none',
                borderColor: 'primary.main',
                position: 'relative'
              }}
            >
              {currentPlan?.id === plan.id && (
                <Chip 
                  label="現在のプラン" 
                  color="primary" 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10 
                  }}
                />
              )}
              
              <CardHeader
                title={plan.name}
                titleTypographyProps={{ align: 'center', variant: 'h6' }}
                sx={{ bgcolor: 'grey.50', pt: 3 }}
              />
              
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography component="h2" variant="h4">
                    {formatPrice(plan.monthly_price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    /月（月額払い）
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="body2">
                    {formatPrice(plan.annual_price / 12)}/月（年額払い）
                  </Typography>
                  {calculateAnnualDiscount(plan) > 0 && (
                    <Chip 
                      label={`年間払いで${calculateAnnualDiscount(plan)}%オフ`} 
                      color="secondary" 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {Object.entries(plan.features)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => (
                      <ListItem key={key} disableGutters>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} 
                        />
                      </ListItem>
                    ))
                  }
                </List>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {plan.limits.api_calls_per_day === -1 ? 
                      '無制限のAPI呼び出し' : 
                      `1日あたり最大${plan.limits.api_calls_per_day}回のAPI呼び出し`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {plan.limits.users === -1 ? 
                      '無制限のユーザー' : 
                      `最大${plan.limits.users}ユーザー`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.limits.locations === -1 ? 
                      '無制限の店舗' : 
                      `最大${plan.limits.locations}店舗`}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3 }}
                  disabled={currentPlan?.id === plan.id}
                  onClick={() => handleOpenUpgradeModal(plan)}
                >
                  {currentPlan?.id === plan.id ? '現在のプラン' : 
                   (currentPlan && plan.monthly_price > currentPlan.monthly_price) ? 'アップグレード' : 
                   (currentPlan && plan.monthly_price < currentPlan.monthly_price) ? 'ダウングレード' : 
                   'プランを選択'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* プランアップグレードモーダル */}
      {selectedPlan && (
        <PlanUpgradeModal
          open={upgradeModalOpen}
          onClose={handleCloseUpgradeModal}
          currentPlan={currentPlan}
          selectedPlan={selectedPlan}
          organization={organization}
        />
      )}

      {/* キャンセル確認ダイアログ */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCloseCancelDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          サブスクリプションをキャンセルしますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            サブスクリプションのキャンセル方法を選択してください。
          </DialogContentText>
          <Box sx={{ mt: 2, mb: 2 }}>
            <List>
              <ListItem 
                button 
                selected={cancelAtPeriodEnd} 
                onClick={() => setCancelAtPeriodEnd(true)}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText 
                  primary="期間終了時にキャンセル"
                  secondary="現在の請求期間の終了時にサブスクリプションが終了します。それまでは通常通りご利用いただけます。"
                />
              </ListItem>
              <ListItem 
                button 
                selected={!cancelAtPeriodEnd} 
                onClick={() => setCancelAtPeriodEnd(false)}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <ListItemText 
                  primary="即時キャンセル"
                  secondary="すぐにサブスクリプションを終了します。日割り返金はありません。"
                />
              </ListItem>
            </List>
          </Box>
          {cancelResult && !cancelResult.success && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {cancelResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
            キャンセルしない
          </Button>
          <Button 
            onClick={handleCancelSubscription} 
            color="error" 
            variant="contained"
            autoFocus
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={24} /> : 'キャンセルを確定'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* キャンセル成功メッセージ */}
      {cancelResult && cancelResult.success && (
        <Alert severity="info" sx={{ mt: 3 }} onClose={() => setCancelResult(null)}>
          {cancelResult.message}
        </Alert>
      )}
    </Box>
  );
};

export default SubscriptionSettings; 