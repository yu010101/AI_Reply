import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import GoogleIcon from '@mui/icons-material/Google';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

// エラータイプの定義
type ErrorType = 'auth' | 'quota' | 'network' | 'server' | 'unknown';

// エラーの詳細情報
interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  retryAfter?: number;
  solutions: string[];
}

export default function GoogleBusinessIntegration() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'not_connected' | 'error'>('not_connected');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [retryTimer, setRetryTimer] = useState<number | null>(null);
  const [retryTimerId, setRetryTimerId] = useState<NodeJS.Timeout | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    access_token: string;
    refresh_token: string;
    expiry_date: string;
    updated_at: string;
  } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
    }
  }, [user?.id]);

  // トークンが有効期限切れの場合の処理
  const handleTokenExpired = () => {
    // エラー情報を設定
    setErrorInfo({
      type: 'auth',
      message: 'トークンの有効期限が切れています',
      details: '認証情報が期限切れになりました。Google認証を再度行ってください。',
      solutions: [
        'Googleアカウントと再連携してください',
        '連携解除ボタンがない場合は、ブラウザのキャッシュをクリアしてからもう一度試してください',
        'それでも解決しない場合は、管理者に連絡してください'
      ]
    });
    
    // 接続状態を更新
    setConnectionStatus('error');
    setErrorMessage('トークンの有効期限が切れています。再認証してください。');
  };
  
  // クォータ制限エラーの処理
  const handleQuotaLimitError = (retryAfter?: number) => {
    const retrySeconds = retryAfter || 60;
    
    // エラー情報を設定
    setErrorInfo({
      type: 'quota',
      message: 'Google APIの制限に達しました',
      details: `短時間に多くのリクエストが送信されたため、Googleサーバーからのレスポンスを一時的に制限しています。${retrySeconds}秒後に再試行できます。`,
      retryAfter: retrySeconds,
      solutions: [
        'しばらく待ってから再試行してください',
        'リクエストの頻度を減らしてください',
        '定期的なバッチ処理に切り替えることを検討してください'
      ]
    });
    
    // リトライタイマーを設定
    setRetryTimer(retrySeconds);
    
    // 既存のタイマーをクリア
    if (retryTimerId) {
      clearInterval(retryTimerId);
    }
    
    // カウントダウンタイマーを開始
    const timerId = setInterval(() => {
      setRetryTimer((prev) => {
        if (prev !== null && prev > 1) {
          return prev - 1;
        } else {
          // 0になったらタイマーをクリア
          if (retryTimerId) {
            clearInterval(retryTimerId);
            setRetryTimerId(null);
          }
          return null;
        }
      });
    }, 1000);
    
    setRetryTimerId(timerId);
    
    // コンポーネントのアンマウント時にタイマーをクリア
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  };

  // ネットワークエラーの処理
  const handleNetworkError = () => {
    setErrorInfo({
      type: 'network',
      message: 'ネットワーク接続エラー',
      details: 'インターネット接続に問題があるか、Googleサーバーに接続できません。',
      solutions: [
        'インターネット接続を確認してください',
        'ブラウザを再読み込みしてください',
        'しばらく待ってから再試行してください'
      ]
    });
  };

  // サーバーエラーの処理
  const handleServerError = (details?: string) => {
    setErrorInfo({
      type: 'server',
      message: 'サーバーエラー',
      details: details || 'サーバー側で問題が発生しました。',
      solutions: [
        'サーバーステータスを確認してください',
        'アプリケーションを再起動してください',
        '管理者に連絡してください'
      ]
    });
  };

  // 認証エラーの処理
  const handleAuthError = (details?: string) => {
    setErrorInfo({
      type: 'auth',
      message: '認証エラー',
      details: details || 'Googleアカウントの認証に問題があります。',
      solutions: [
        'Googleアカウントと再連携してください',
        'アプリケーションからログアウトして再度ログインしてください',
        'Googleアカウントの権限を確認してください'
      ]
    });
  };

  // エラーのクリア
  const clearError = () => {
    setErrorInfo(null);
    setErrorMessage('');
    if (retryTimerId) {
      clearInterval(retryTimerId);
      setRetryTimerId(null);
    }
    setRetryTimer(null);
  };

  // 自動再試行
  const autoRetry = async () => {
    clearError();
    await checkConnectionStatus();
  };

  // エラーレスポンスの解析とハンドリング
  const handleApiError = (error: any, statusCode?: number) => {
    // エラーメッセージの解析
    const errorMessage = error?.message || error?.error || '不明なエラーが発生しました';
    
    // エラータイプの判定
    if (errorMessage.includes('Quota exceeded') || statusCode === 429) {
      // クォータ/レート制限エラー
      const retryAfter = error?.retryAfter || 60;
      handleQuotaLimitError(retryAfter);
      setErrorMessage(`API制限に達しました。${retryAfter}秒後に再試行できます。`);
      return;
    }
    
    if (errorMessage.includes('authentication') || errorMessage.includes('認証') || statusCode === 401) {
      // 認証エラー
      handleAuthError(errorMessage);
      setErrorMessage('認証エラー: ' + errorMessage);
      return;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      // ネットワークエラー
      handleNetworkError();
      setErrorMessage('ネットワークエラー: ' + errorMessage);
      return;
    }
    
    if (statusCode && statusCode >= 500) {
      // サーバーエラー
      handleServerError(errorMessage);
      setErrorMessage('サーバーエラー: ' + errorMessage);
      return;
    }
    
    // その他の不明なエラー
    setErrorInfo({
      type: 'unknown',
      message: '不明なエラー',
      details: errorMessage,
      solutions: [
        'ブラウザを再読み込みしてください',
        'アプリケーションを再起動してください',
        '問題が解決しない場合は管理者に連絡してください'
      ]
    });
    
    setErrorMessage('エラー: ' + errorMessage);
  };

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      clearError();

      if (!user?.id) {
        setConnectionStatus('not_connected');
        setLoading(false);
        return;
      }

      try {
        const mainResult: any = await (supabase as any)
          .from('google_auth_tokens')
          .select('access_token, refresh_token, expiry_date, updated_at, tenant_id')
          .eq('tenant_id', user.id)
          .limit(1);
        const data = mainResult.data;
        const error = mainResult.error;

        if (!data || data.length === 0) {
          setConnectionStatus('not_connected');
          setLoading(false);
          return;
        }

        const tokenData = data[0];

        // トークンの有効期限を確認
        const expiryDate = new Date(tokenData.expiry_date);
        const now = new Date();

        setTokenInfo({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expiry_date: tokenData.expiry_date,
          updated_at: tokenData.updated_at
        });

        if (now >= expiryDate) {
          handleTokenExpired();
        } else {
          setConnectionStatus('connected');
          clearError();
        }
      } catch (dbError) {
        setErrorMessage('データベース操作中にエラーが発生しました');
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setLoadingAccounts(false);
    }
  }, [connectionStatus]);

  const startGoogleAuth = async () => {
    try {
      setAuthenticating(true);

      const response = await fetch('/api/auth/google-auth', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          handleApiError(errorData, response.status);
        } catch (parseError) {
          setErrorMessage(`Google認証の開始に失敗しました: サーバーエラー (${response.status} ${response.statusText})`);
          handleServerError(`APIレスポンスパースエラー: ${response.status} ${response.statusText}`);
        }
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        setErrorMessage('Google認証の開始に失敗しました: レスポンスが不正なJSONフォーマットです');
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }

      if (data.error) {
        setErrorMessage(`Google認証の開始に失敗しました: ${data.error}${data.details ? ` (${data.details})` : ''}`);
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('認証URLの取得に失敗しました');
      }
    } catch (error) {
      handleApiError(error);
      setConnectionStatus('error');
      setAuthenticating(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      setLoading(true);

      await supabase
        .from('google_auth_tokens')
        .delete()
        .eq('tenant_id', user?.id);

      setConnectionStatus('not_connected');
      setTokenInfo(null);
      setAccounts([]);
    } catch (error) {
      setErrorMessage('Googleアカウントの切断に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setError(null);
      setLoadingAccounts(true);

      const response = await fetch('/api/google-business/accounts', {
        headers: {
          'Cache-Control': 'max-age=300',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 429) {
          const retryAfter = errorData.retryAfter || 60;
          handleQuotaLimitError(retryAfter);

          if (errorData.nextRefreshAvailable) {
            const nextTime = new Date(errorData.nextRefreshAvailable);
            const message = `次回更新可能: ${nextTime.toLocaleString('ja-JP')}（あと約${Math.ceil(errorData.cooldownSeconds / 60)}分）`;
            setErrorMessage(`API制限に達しました。${message}`);
          } else {
            setErrorMessage(`API制限に達しました。${retryAfter}秒後に再試行できます。`);
          }
          throw new Error(errorData.error || 'APIリクエスト制限に達しました');
        }

        throw new Error(errorData.error || 'アカウント情報の取得に失敗しました');
      }

      const data = await response.json();

      if (!data.accounts || data.accounts.length === 0) {
        setAccounts([]);
        return;
      }

      if (data.source === 'forced-cache' && data.nextRefreshAvailable) {
        const nextTime = new Date(data.nextRefreshAvailable);
        const message = `次回更新可能: ${nextTime.toLocaleString('ja-JP')}（あと約${Math.ceil(data.cooldownSeconds / 60)}分）`;
        setErrorMessage(message);
      } else {
        setErrorMessage('');
      }

      setAccounts(data.accounts);
    } catch (error: any) {
      setError(error.message || 'アカウント情報の取得に失敗しました');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const forceReAuthenticate = async () => {
    try {
      setLoading(true);

      await supabase
        .from('google_auth_tokens')
        .delete()
        .eq('tenant_id', user?.id);

      setConnectionStatus('not_connected');
      setTokenInfo(null);
      setAccounts([]);
      clearError();
      setLoading(false);

      startGoogleAuth();
    } catch (error) {
      setErrorMessage('再認証処理中にエラーが発生しました');
      handleApiError(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  // エラー対応ガイダンスコンポーネント
  const renderErrorGuidance = () => {
    if (!errorInfo) return null;
    
    return (
      <Box sx={{ mt: 2, mb: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography color="error" sx={{ display: 'flex', alignItems: 'center' }}>
              <HelpOutlineIcon sx={{ mr: 1 }} /> 問題の解決方法
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                エラー詳細:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {errorInfo.details || errorInfo.message}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                解決策:
              </Typography>
              <List dense>
                {errorInfo.solutions.map((solution, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={solution} />
                  </ListItem>
                ))}
              </List>
              
              {errorInfo.type === 'quota' && retryTimer !== null && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    自動再試行まであと: {retryTimer}秒
                  </Typography>
                </Alert>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                {errorInfo.type === 'auth' && (
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<GoogleIcon />}
                    onClick={forceReAuthenticate}
                  >
                    再認証する
                  </Button>
                )}
                
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={autoRetry}
                >
                  今すぐ再試行
                </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  return (
    <div className="settings-container">
      <Paper elevation={1}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Google Business Profile連携
          </Typography>
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errorMessage}
            </Alert>
          )}
          
          {errorInfo && renderErrorGuidance()}
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              Google Business Profileと連携することで、Googleに投稿されたレビューの取得と返信が可能になります。
            </Typography>
          </Box>
          
          {connectionStatus === 'not_connected' ? (
            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={startGoogleAuth}
              disabled={authenticating}
            >
              {authenticating ? <CircularProgress size={24} /> : 'Googleアカウントと連携する'}
            </Button>
          ) : connectionStatus === 'connected' ? (
            <Box>
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                Google Business Profileと連携しています
              </Alert>
              
              {tokenInfo && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    最終更新日時: {new Date(tokenInfo.updated_at).toLocaleString('ja-JP')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    有効期限: {new Date(tokenInfo.expiry_date).toLocaleString('ja-JP')}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  連携アカウント
                  <Button 
                    size="small" 
                    startIcon={<RefreshIcon />}
                    onClick={fetchAccounts}
                    disabled={loadingAccounts}
                    sx={{ ml: 2 }}
                  >
                    更新
                  </Button>
                </Typography>
                
                {loadingAccounts ? (
                  <CircularProgress size={24} />
                ) : accounts.length > 0 ? (
                  <List>
                    {accounts.map((account) => (
                      <ListItem key={account.name} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {account.displayName || account.name}
                              {account.cached && (
                                <Chip 
                                  size="small"
                                  label="キャッシュ"
                                  color="info"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            account.cached 
                              ? `${account.accountName || ''} (${new Date(account.lastUpdated).toLocaleString('ja-JP')}に更新)`
                              : account.accountName || ''
                          }
                        />
                        <Chip 
                          icon={<StorefrontIcon />} 
                          label={`${account.locationCount || 0} 店舗`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    連携しているアカウントがありません
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="outlined"
                color="error"
                onClick={disconnectGoogle}
                disabled={loading}
              >
                連携解除
              </Button>
            </Box>
          ) : (
            <Box>
              <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                Google Business Profileとの連携に問題があります
              </Alert>
              
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<GoogleIcon />}
                  onClick={forceReAuthenticate}
                  disabled={loading}
                >
                  再認証する
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => checkConnectionStatus()}
                  disabled={loading}
                >
                  状態を確認
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </div>
  );
} 