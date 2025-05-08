import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import { SubscriptionPlan } from '@/models/SubscriptionPlan';
import { Organization } from '@/models/Organization';
import axios from 'axios';

interface PlanUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan | null;
  selectedPlan: SubscriptionPlan;
  organization: Organization | null;
}

const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  open,
  onClose,
  currentPlan,
  selectedPlan,
  organization
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プランがアップグレードかどうかを判定
  const isUpgrade = currentPlan && selectedPlan.monthly_price > currentPlan.monthly_price;
  
  // プランの変更種別に応じたテキスト
  const actionText = isUpgrade ? 'アップグレード' : 'ダウングレード';
  
  // 選択中のプランと請求サイクルに基づく価格
  const price = billingCycle === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price / 12;
  
  // 現在のプランがある場合は差額を計算
  const currentPrice = currentPlan ? 
    (billingCycle === 'monthly' ? currentPlan.monthly_price : currentPlan.annual_price / 12) : 0;
  
  // 差額
  const priceDifference = price - currentPrice;
  
  // モーダル内でのプランタイトル
  const modalTitle = currentPlan ? 
    `プランを${actionText}する` : 
    'サブスクリプションプランを選択';

  // プラン変更を実行
  const handleChangePlan = async () => {
    if (!organization) {
      setError('組織情報が見つかりません');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // APIを呼び出してStripeチェックアウトセッションを作成
      const response = await axios.post('/api/subscriptions/upgrade', {
        organizationId: organization.id,
        planId: selectedPlan.id,
        billingCycle
      });

      // チェックアウトページにリダイレクト
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('支払いURLが取得できませんでした');
      }
    } catch (err) {
      console.error('プラン変更エラー:', err);
      setError(err instanceof Error ? err.message : '処理中にエラーが発生しました');
      setLoading(false);
    }
  };

  // 年間プランの割引率計算
  const calculateAnnualDiscount = (plan: SubscriptionPlan): number => {
    if (plan.monthly_price === 0) return 0;
    const monthlyTotal = plan.monthly_price * 12;
    const annualTotal = plan.annual_price;
    return Math.round((1 - (annualTotal / monthlyTotal)) * 100);
  };

  // 価格表示のフォーマット
  const formatPrice = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{modalTitle}</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          {selectedPlan.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {selectedPlan.description}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          請求サイクルを選択
        </Typography>
        
        <RadioGroup
          value={billingCycle}
          onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
          name="billing-cycle"
        >
          <FormControlLabel 
            value="monthly" 
            control={<Radio />} 
            label={
              <Box>
                <Typography>月額払い</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPrice(selectedPlan.monthly_price)}/月
                </Typography>
              </Box>
            } 
          />
          
          <FormControlLabel 
            value="annual" 
            control={<Radio />} 
            label={
              <Box>
                <Typography>年額払い</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPrice(selectedPlan.annual_price / 12)}/月（{formatPrice(selectedPlan.annual_price)}/年）
                </Typography>
                {calculateAnnualDiscount(selectedPlan) > 0 && (
                  <Typography variant="body2" color="secondary">
                    月額払いより{calculateAnnualDiscount(selectedPlan)}%お得
                  </Typography>
                )}
              </Box>
            } 
          />
        </RadioGroup>
        
        <Divider sx={{ my: 2 }} />
        
        {currentPlan && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              料金の変更
            </Typography>
            
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">現在のプラン:</Typography>
              <Typography variant="body2">
                {formatPrice(currentPrice)}/月
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">新しいプラン:</Typography>
              <Typography variant="body2">
                {formatPrice(price)}/月
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="subtitle2">差額:</Typography>
              <Typography 
                variant="subtitle2" 
                color={priceDifference > 0 ? 'error' : 'success'}
              >
                {priceDifference > 0 ? '+' : ''}{formatPrice(priceDifference)}/月
              </Typography>
            </Box>
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          {currentPlan ? (
            priceDifference > 0 ? (
              '差額分の支払いが発生します。即時に新しいプランが適用されます。'
            ) : priceDifference < 0 ? (
              '現在の請求期間が終了次第、新しいプランに切り替わります。'
            ) : (
              '請求サイクルのみの変更となります。'
            )
          ) : (
            'サブスクリプションを開始すると、今すぐ支払いが発生します。'
          )}
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
        >
          キャンセル
        </Button>
        <Button 
          onClick={handleChangePlan} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? '処理中...' : (
            currentPlan ? `${actionText}する` : 'サブスクリプションを開始'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanUpgradeModal; 