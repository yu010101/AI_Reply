import { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Alert, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function GoogleBusinessIntegration() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'not_connected' | 'error'>('not_connected');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{
    access_token: string;
    refresh_token: string;
    expiry_date: string;
    updated_at: string;
  } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      // Google認証トークンを確認
      const { data, error } = await supabase
        .from('google_auth_tokens')
        .select('*')
        .eq('tenant_id', user?.id)
        .single();

      if (error || !data) {
        setConnectionStatus('not_connected');
        return;
      }

      // トークンの有効期限を確認
      const expiryDate = new Date(data.expiry_date);
      const now = new Date();
      
      setTokenInfo({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        updated_at: data.updated_at
      });

      if (now >= expiryDate) {
        // トークンの有効期限切れ（ただし自動更新されるはず）
        setConnectionStatus('error');
        setErrorMessage('トークンの有効期限が切れています。再認証してください。');
      } else {
        setConnectionStatus('connected');
        fetchAccounts();
      }
    } catch (error) {
      console.error('認証状態確認エラー:', error);
      setConnectionStatus('error');
      setErrorMessage('認証状態の確認中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const startGoogleAuth = async () => {
    try {
      setAuthenticating(true);
      
      // 認証URLを取得
      const response = await fetch('/api/auth/google-auth');
      const data = await response.json();
      
      if (data.url) {
        // 認証ページに遷移
        window.location.href = data.url;
      } else {
        throw new Error('認証URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      setErrorMessage('Google認証の開始に失敗しました');
      setConnectionStatus('error');
      setAuthenticating(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      setLoading(true);
      
      // トークンを削除
      await supabase
        .from('google_auth_tokens')
        .delete()
        .eq('tenant_id', user?.id);
      
      setConnectionStatus('not_connected');
      setTokenInfo(null);
      setAccounts([]);
    } catch (error) {
      console.error('切断エラー:', error);
      setErrorMessage('Googleアカウントの切断に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      
      // アカウント一覧を取得
      const response = await fetch('/api/google-business/accounts');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('アカウント取得エラー:', error);
      setErrorMessage('Google Business Profileアカウントの取得に失敗しました');
    } finally {
      setLoadingAccounts(false);
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Google Business Profile連携
      </Typography>
      
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      
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
            <Typography variant="subtitle1" gutterBottom>
              連携アカウント
            </Typography>
            
            {loadingAccounts ? (
              <CircularProgress size={24} />
            ) : accounts.length > 0 ? (
              <List>
                {accounts.map((account) => (
                  <ListItem key={account.name} divider>
                    <ListItemText
                      primary={account.displayName || account.name}
                      secondary={account.accountName || ''}
                    />
                    <Chip 
                      icon={<StorefrontIcon />} 
                      label={`${account.locationCount || 0} 店舗`}
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                連携されているアカウントがありません
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={fetchAccounts}
              disabled={loadingAccounts}
            >
              {loadingAccounts ? <CircularProgress size={24} /> : 'アカウント情報を更新'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={disconnectGoogle}
              disabled={loading}
            >
              連携を解除
            </Button>
          </Box>
        </Box>
      ) : (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          Google Business Profileとの連携中にエラーが発生しました
          <Button
            variant="outlined"
            size="small"
            onClick={startGoogleAuth}
            sx={{ ml: 2 }}
          >
            再連携
          </Button>
        </Alert>
      )}
    </Paper>
  );
} 