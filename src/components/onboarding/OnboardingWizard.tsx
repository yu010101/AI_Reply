import { useState, useEffect } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, TextField, CircularProgress, Alert, Card, CardContent, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { CheckCircle, Store, Business, CreditCard, Check } from '@mui/icons-material';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/router';

const steps = [
  'ようこそ',
  '店舗情報の設定',
  'Google連携',
  'プラン選択',
  '完了'
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter();
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
    if (!businessName || !address) {
      setError('店舗名と住所を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('認証情報が見つかりません');
      }

      // テナントIDを取得（ユーザーIDをテナントIDとして使用）
      const tenantId = user.id;

      // 店舗情報を保存
      const { data, error: insertError } = await supabase
        .from('locations')
        .insert({
          tenant_id: tenantId,
          name: businessName,
          address: address,
          google_place_id: googlePlaceId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 次のステップへ
      handleNext();
    } catch (err: any) {
      console.error('店舗登録エラー:', err);
      setError(err.message || '店舗情報の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // オンボーディング完了フラグを更新
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // まずプロファイルが存在するか確認
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          // プロファイルが存在する場合は更新
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('オンボーディング完了フラグの更新エラー:', updateError);
            // エラーでも続行（プロファイルが存在しない場合など）
          }
        } else {
          // プロファイルが存在しない場合は作成
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              onboarding_completed: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('プロファイル作成エラー:', insertError);
            // エラーでも続行
          }
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('オンボーディング完了エラー:', err);
      setError('オンボーディングの完了処理に失敗しましたが、続行します');
      // エラーでもonCompleteを呼び出す（ユーザー体験を優先）
      setTimeout(() => {
        onComplete();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 3 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ステップ0: ようこそ */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              RevAI Conciergeへようこそ！
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Googleレビューの管理とAI返信生成を効率的に行うためのツールです。
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                このアプリでできること
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Store color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="店舗管理"
                    secondary="複数の店舗を一元管理し、それぞれのレビューを追跡できます"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Business color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Googleレビュー連携"
                    secondary="Googleビジネスプロフィールと連携して、レビューを自動取得"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="AI返信生成"
                    secondary="OpenAIを活用して、店舗のトーンに合わせた返信を自動生成"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CreditCard color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="分析ダッシュボード"
                    secondary="レビュー統計や返信率を可視化して、パフォーマンスを把握"
                  />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                💡 <strong>ヒント:</strong> 初期設定は約5分で完了します。後からいつでも変更できます。
              </Typography>
            </Box>
          </Box>
        )}

        {/* ステップ1: 店舗情報の設定 */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              店舗情報の設定
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              まずは管理したい店舗の基本情報を入力してください。
            </Typography>
            <TextField
              fullWidth
              label="店舗名"
              variant="outlined"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              sx={{ mb: 2 }}
              helperText="例: 〇〇レストラン、△△カフェ"
            />
            <TextField
              fullWidth
              label="住所"
              variant="outlined"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              sx={{ mb: 2 }}
              helperText="店舗の所在地を入力してください"
            />
            <TextField
              fullWidth
              label="Google Place ID（任意）"
              variant="outlined"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Google Maps Platformから取得したPlace IDを入力してください。後から設定することもできます。"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              店舗情報は後から「店舗管理」ページで追加・編集できます。
            </Alert>
          </Box>
        )}

        {/* ステップ2: Google連携 */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Googleビジネスプロフィール連携
            </Typography>
            <Typography variant="body1" paragraph>
              Googleビジネスプロフィールと連携することで、レビューを自動的に取得できます。
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  連携手順
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="1. Googleアカウントでログイン"
                      secondary="Googleビジネスプロフィールにアクセスできるアカウントが必要です"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="2. 連携ボタンをクリック"
                      secondary="次の画面で「Google連携」ボタンをクリックします"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="3. 権限を許可"
                      secondary="Googleアカウントへのアクセス権限を許可してください"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="4. 店舗を選択"
                      secondary="管理したい店舗を選択します"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              ⚠️ 連携は後から「設定」→「Google Business Profile連携」ページでいつでも設定できます。
              今はスキップして次に進むことも可能です。
            </Alert>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/settings')}
              >
                今すぐ連携する
              </Button>
              <Button
                variant="text"
                onClick={handleNext}
              >
                後で設定する
              </Button>
            </Box>
          </Box>
        )}

        {/* ステップ3: プラン選択 */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              プラン選択
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              ご利用のプランを選択してください。まずは無料プランから始めることをおすすめします。
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  利用可能なプラン
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Check color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="無料プラン"
                      secondary="基本機能が利用可能。1店舗まで管理可能"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Check color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="スタータープラン"
                      secondary="月額5,000円。3店舗まで管理可能"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Check color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="ビジネスプラン"
                      secondary="月額15,000円。10店舗まで管理可能"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              💡 プラン選択は「設定」→「サブスクリプション管理」ページからいつでも変更できます。
              まずは無料プランで試してみることをおすすめします。
            </Alert>

            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              sx={{ mt: 2 }}
            >
              無料プランで始める
            </Button>
          </Box>
        )}

        {/* ステップ4: 完了 */}
        {activeStep === 4 && (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              設定完了！
            </Typography>
            <Typography variant="body1" paragraph>
              おめでとうございます！初期設定が完了しました。
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              さっそくGoogleレビューの管理を始めましょう。
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                次のステップ
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="ダッシュボードを確認"
                    secondary="レビュー統計や分析データを確認できます"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="レビューを確認"
                    secondary="「レビュー」ページでレビュー一覧を確認"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="設定をカスタマイズ"
                    secondary="「設定」ページで通知や連携を設定"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
          >
            戻る
          </Button>
          <Box>
            {activeStep < steps.length - 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={activeStep === 1 ? handleCreateLocation : handleNext}
                disabled={loading || (activeStep === 1 && (!businessName || !address))}
              >
                {loading ? <CircularProgress size={24} /> : activeStep === steps.length - 2 ? '完了' : '次へ'}
              </Button>
            )}
            {activeStep === steps.length - 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'ダッシュボードへ'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
