import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/stripe';
import { Plan } from '@/constants/plan';

interface SubscriptionHistory {
  id: string;
  tenant_id: string;
  stripe_subscription_id: string;
  plan: Plan;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  amount: number;
}

interface PaymentHistory {
  id: string;
  tenant_id: string;
  stripe_payment_id: string;
  amount: number;
  status: string;
  payment_date: string;
  created_at: string;
}

export default function SubscriptionHistoryPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistory[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptionHistory();
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchSubscriptionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('サブスクリプション履歴取得エラー:', error);
        setError('サブスクリプション履歴の取得に失敗しました');
      } else {
        setSubscriptions(data || []);
      }
    } catch (err) {
      console.error('サブスクリプション履歴取得エラー:', err);
      setError('サブスクリプション履歴の取得に失敗しました');
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('支払い履歴取得エラー:', error);
        setError('支払い履歴の取得に失敗しました');
      } else {
        setPayments(data || []);
      }
    } catch (err) {
      console.error('支払い履歴取得エラー:', err);
      setError('支払い履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  // 支払いステータスを日本語に変換
  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'succeeded': '完了',
      'pending': '処理中',
      'failed': '失敗',
      'active': '有効',
      'canceled': 'キャンセル',
      'incomplete': '未完了',
      'incomplete_expired': '期限切れ',
      'trialing': '試用期間',
      'past_due': '支払い遅延',
      'unpaid': '未払い'
    };
    return statusMap[status] || status;
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            請求履歴
          </Typography>

          {error && (
            <Typography color="error" paragraph>
              {error}
            </Typography>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                サブスクリプション履歴
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>開始日</TableCell>
                      <TableCell>終了日</TableCell>
                      <TableCell>プラン</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>金額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.length > 0 ? (
                      subscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>{formatDate(subscription.current_period_start)}</TableCell>
                          <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                          <TableCell>
                            {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}プラン
                          </TableCell>
                          <TableCell>{translateStatus(subscription.status)}</TableCell>
                          <TableCell>{formatPrice(subscription.plan as Plan)} / 月</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          サブスクリプションの履歴がありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                支払い履歴
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>決済日</TableCell>
                      <TableCell>金額</TableCell>
                      <TableCell>ステータス</TableCell>
                      <TableCell>決済ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length > 0 ? (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell>¥{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{translateStatus(payment.status)}</TableCell>
                          <TableCell>{payment.stripe_payment_id}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          支払い履歴がありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Layout>
    </AuthGuard>
  );
} 