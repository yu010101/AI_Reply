import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaEnrollmentStep, setMfaEnrollmentStep] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [sessionActivity, setSessionActivity] = useState<any[]>([]);
  const [accountActivity, setAccountActivity] = useState<any[]>([]);

  // 2FA状態の取得
  useEffect(() => {
    if (user) {
      fetchMfaStatus();
      fetchActivityLogs();
    }
  }, [user]);

  // 2FA状態の取得
  const fetchMfaStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_mfa')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('MFA状態取得エラー:', error);
      } else {
        setMfaEnabled(!!data);
      }
    } catch (err) {
      console.error('MFA状態取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // アクティビティログの取得
  const fetchActivityLogs = async () => {
    try {
      // セッションアクティビティ
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionError) {
        console.error('セッションログ取得エラー:', sessionError);
      } else {
        setSessionActivity(sessionData || []);
      }

      // アカウントアクティビティ
      const { data: activityData, error: activityError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) {
        console.error('アクティビティログ取得エラー:', activityError);
      } else {
        setAccountActivity(activityData || []);
      }
    } catch (err) {
      console.error('アクティビティログ取得エラー:', err);
    }
  };

  // 2FA登録の開始
  const startMfaEnrollment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/mfa/setup', {
        userId: user?.id
      });

      if (response.data.qrCodeUrl && response.data.secret) {
        setQrCodeUrl(response.data.qrCodeUrl);
        setSecret(response.data.secret);
        setMfaEnrollmentStep(1);
      } else {
        setError('2要素認証の設定に失敗しました');
      }
    } catch (err: any) {
      console.error('2FA設定エラー:', err);
      setError(err.response?.data?.error || '2要素認証の設定に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 2FA認証コードの確認
  const verifyMfaCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('有効な認証コードを入力してください（6桁）');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/mfa/verify', {
        userId: user?.id,
        secret,
        token: verificationCode
      });

      if (response.data.success) {
        setBackupCodes(response.data.backupCodes || []);
        setMfaEnrollmentStep(2);
        setSuccess('2要素認証が正常に設定されました');
        
        // MFA状態を更新
        fetchMfaStatus();
      } else {
        setError('認証コードが無効です。もう一度お試しください');
      }
    } catch (err: any) {
      console.error('2FA検証エラー:', err);
      setError(err.response?.data?.error || '認証コードの検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 2FAの無効化
  const disableMfa = async () => {
    setPasswordDialogOpen(true);
  };

  // パスワード確認後に2FAを無効化
  const confirmDisableMfa = async () => {
    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // パスワードの確認
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password
      });
      
      if (signInError) {
        setError('パスワードが正しくありません');
        setLoading(false);
        return;
      }
      
      // 2FAの無効化
      const response = await axios.post('/api/auth/mfa/disable', {
        userId: user?.id
      });

      if (response.data.success) {
        setMfaEnabled(false);
        setSuccess('2要素認証が無効化されました');
        setPasswordDialogOpen(false);
        setPassword('');
        
        // 監査ログに記録
        await supabase.from('audit_logs').insert([{
          user_id: user?.id,
          action: 'mfa_disabled',
          resource_type: 'user',
          resource_id: user?.id,
          details: JSON.stringify({
            timestamp: new Date().toISOString()
          })
        }]);
        
        // アクティビティログを更新
        fetchActivityLogs();
      } else {
        setError('2要素認証の無効化に失敗しました');
      }
    } catch (err: any) {
      console.error('2FA無効化エラー:', err);
      setError(err.response?.data?.error || '2要素認証の無効化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // バックアップコードの再生成
  const regenerateBackupCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/mfa/regenerate-backup-codes', {
        userId: user?.id
      });

      if (response.data.backupCodes) {
        setBackupCodes(response.data.backupCodes);
        setShowBackupCodes(true);
        setSuccess('バックアップコードが再生成されました');
        
        // 監査ログに記録
        await supabase.from('audit_logs').insert([{
          user_id: user?.id,
          action: 'mfa_backup_codes_regenerated',
          resource_type: 'user',
          resource_id: user?.id,
          details: JSON.stringify({
            timestamp: new Date().toISOString()
          })
        }]);
      } else {
        setError('バックアップコードの再生成に失敗しました');
      }
    } catch (err: any) {
      console.error('バックアップコード再生成エラー:', err);
      setError(err.response?.data?.error || 'バックアップコードの再生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            セキュリティ設定
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
            {/* 2要素認証設定 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  2要素認証
                </Typography>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress />
                  </Box>
                ) : mfaEnabled ? (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      2要素認証が有効です
                    </Alert>
                    
                    <Typography variant="body2" paragraph>
                      2要素認証により、アカウントのセキュリティが強化されています。ログイン時には認証アプリからコードの入力が必要です。
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setShowBackupCodes(true)}
                        sx={{ mr: 2, mb: 1 }}
                      >
                        バックアップコードを表示
                      </Button>
                      
                      <Button
                        variant="outlined"
                        onClick={regenerateBackupCodes}
                        sx={{ mb: 1 }}
                      >
                        新しいバックアップコードを生成
                      </Button>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={disableMfa}
                      >
                        2要素認証を無効化
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      2要素認証は現在無効です
                    </Alert>
                    
                    <Typography variant="body2" paragraph>
                      2要素認証を有効にすると、セキュリティが強化され、アカウントへの不正アクセスを防ぐことができます。ログイン時には、スマートフォンの認証アプリからコードの入力が必要になります。
                    </Typography>
                    
                    {mfaEnrollmentStep === 0 ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={startMfaEnrollment}
                        disabled={loading}
                      >
                        2要素認証を有効にする
                      </Button>
                    ) : (
                      <Box>
                        <Stepper activeStep={mfaEnrollmentStep - 1} sx={{ mb: 3 }}>
                          <Step>
                            <StepLabel>QRコードをスキャン</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>コードを確認</StepLabel>
                          </Step>
                        </Stepper>
                        
                        {mfaEnrollmentStep === 1 && (
                          <>
                            <Typography variant="body1" gutterBottom>
                              以下の手順に従って2要素認証を設定してください:
                            </Typography>
                            <ol>
                              <li>Google AuthenticatorやMicrosoft Authenticatorなどの認証アプリをスマートフォンにインストールします</li>
                              <li>アプリでQRコードをスキャンするか、以下のコードを手動で入力します</li>
                              <li>アプリに表示される6桁のコードを入力して確認します</li>
                            </ol>
                            
                            <Box display="flex" justifyContent="center" my={3}>
                              {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={200} />}
                            </Box>
                            
                            <Typography variant="body2" gutterBottom>
                              手動セットアップコード:
                            </Typography>
                            <Typography variant="body2" component="div" 
                              sx={{ 
                                bgcolor: 'background.paper', 
                                p: 1, 
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                wordBreak: 'break-all'
                              }}
                            >
                              {secret}
                            </Typography>
                            
                            <Box sx={{ mt: 3 }}>
                              <TextField
                                label="認証コード"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                                placeholder="6桁のコードを入力"
                                inputProps={{ maxLength: 6 }}
                              />
                              
                              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                  onClick={() => setMfaEnrollmentStep(0)}
                                >
                                  キャンセル
                                </Button>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={verifyMfaCode}
                                  disabled={loading}
                                >
                                  確認
                                </Button>
                              </Box>
                            </Box>
                          </>
                        )}
                        
                        {mfaEnrollmentStep === 2 && (
                          <>
                            <Alert severity="success" sx={{ mb: 2 }}>
                              2要素認証が正常に設定されました
                            </Alert>
                            
                            <Typography variant="body1" gutterBottom>
                              以下のバックアップコードを安全な場所に保管してください。認証アプリにアクセスできなくなった場合に使用できます。
                            </Typography>
                            
                            <Box 
                              sx={{ 
                                bgcolor: 'background.paper', 
                                p: 2, 
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                mt: 2,
                                mb: 3,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 1
                              }}
                            >
                              {backupCodes.map((code, index) => (
                                <Typography key={index} variant="body2">
                                  {code}
                                </Typography>
                              ))}
                            </Box>
                            
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                setMfaEnrollmentStep(0);
                                fetchMfaStatus();
                              }}
                            >
                              完了
                            </Button>
                          </>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>

            {/* セッションアクティビティ */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  最近のセッション
                </Typography>
                
                {sessionActivity.length > 0 ? (
                  <Box>
                    {sessionActivity.map((session, index) => (
                      <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < sessionActivity.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {session.ip_address}
                          {session.is_current && (
                            <Box component="span" sx={{ ml: 1, color: 'success.main', fontSize: '0.8rem' }}>
                              (現在のセッション)
                            </Box>
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          デバイス: {session.user_agent || '不明'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ログイン: {new Date(session.created_at).toLocaleString('ja-JP')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    セッション情報がありません
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* アカウントアクティビティ */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  アカウントアクティビティ
                </Typography>
                
                {accountActivity.length > 0 ? (
                  <Box>
                    {accountActivity.map((activity, index) => (
                      <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < accountActivity.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {activity.action.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          日時: {new Date(activity.created_at).toLocaleString('ja-JP')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    アクティビティ情報がありません
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* バックアップコード表示ダイアログ */}
          <Dialog
            open={showBackupCodes}
            onClose={() => setShowBackupCodes(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>バックアップコード</DialogTitle>
            <DialogContent>
              <DialogContentText paragraph>
                以下のバックアップコードを安全な場所に保管してください。各コードは1回だけ使用できます。
              </DialogContentText>
              
              <Box 
                sx={{ 
                  bgcolor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1
                }}
              >
                {backupCodes.map((code, index) => (
                  <Typography key={index} variant="body2">
                    {code}
                  </Typography>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowBackupCodes(false)}>閉じる</Button>
            </DialogActions>
          </Dialog>

          {/* 2FA無効化のパスワード確認ダイアログ */}
          <Dialog
            open={passwordDialogOpen}
            onClose={() => {
              setPasswordDialogOpen(false);
              setPassword('');
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>2要素認証を無効化</DialogTitle>
            <DialogContent>
              <DialogContentText paragraph>
                2要素認証を無効化すると、アカウントのセキュリティレベルが低下します。続行するには、パスワードを入力してください。
              </DialogContentText>
              
              <TextField
                autoFocus
                margin="dense"
                label="パスワード"
                type="password"
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPassword('');
                }}
              >
                キャンセル
              </Button>
              <Button onClick={confirmDisableMfa} color="error" variant="contained">
                2要素認証を無効化
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Layout>
    </AuthGuard>
  );
} 