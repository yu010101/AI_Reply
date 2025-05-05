import { useState } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, TextField, CircularProgress, Alert } from '@mui/material';
import { supabase } from '@/utils/supabase';

const steps = [
  '店舗情報の設定',
  'Google連携',
  'プラン選択',
  '完了'
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleCreateLocation = async () => {
    if (!businessName || !address || !googlePlaceId) {
      setError('すべての項目を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // テナントIDを取得
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.id;

      if (!tenantId) {
        throw new Error('認証情報が見つかりません');
      }

      // 店舗情報を保存
      const { data, error } = await supabase
        .from('locations')
        .insert({
          tenant_id: tenantId,
          name: businessName,
          address: address,
          google_place_id: googlePlaceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // 次のステップへ
      handleNext();
    } catch (err) {
      console.error('店舗登録エラー:', err);
      setError('店舗情報の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              店舗情報の設定
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              まずは店舗の基本情報を入力してください。
            </Typography>
            <TextField
              fullWidth
              label="店舗名"
              variant="outlined"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="住所"
              variant="outlined"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Google Place ID"
              variant="outlined"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              helperText="Google Maps Platform から取得したIDを入力してください"
              sx={{ mb: 2 }}
            />
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Google連携
            </Typography>
            <Typography variant="body1" paragraph>
              Googleビジネスプロフィールと連携するには、以下の手順に従ってください：
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer">
                    Google ビジネスプロフィール
                  </a>
                  にログインします。
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  「情報」タブから「APIアクセス」を選択します。
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  「承認を管理」をクリックし、RevAI Conciergeにアクセス権を付与します。
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  画面の指示に従って認証を完了してください。
                </Typography>
              </li>
            </ol>
            <Typography variant="body2" color="text.secondary">
              ※連携は後からでも設定可能です
            </Typography>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              プラン選択
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              ご利用のプランを選択してください。まずは無料プランから始めることもできます。
            </Typography>
            <Typography paragraph>
              プラン選択は「アカウント」→「請求情報」ページからいつでも変更できます。
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              sx={{ mt: 2 }}
            >
              プラン選択へ進む
            </Button>
          </Box>
        )}

        {activeStep === 3 && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              設定完了！
            </Typography>
            <Typography paragraph>
              おめでとうございます！初期設定が完了しました。
            </Typography>
            <Typography paragraph>
              さっそくGoogleレビューの管理を始めましょう。
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleComplete}
              sx={{ mt: 2 }}
            >
              ダッシュボードへ
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
          >
            戻る
          </Button>
          <Box>
            {activeStep < steps.length - 1 && activeStep !== 2 && (
              <Button
                variant="contained"
                color="primary"
                onClick={activeStep === 0 ? handleCreateLocation : handleNext}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : '次へ'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
} 