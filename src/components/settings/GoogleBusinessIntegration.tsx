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
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Divider from '@mui/material/Divider';
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

  // 認証状態の検証用ログ
  useEffect(() => {
    console.log('[GoogleBI検証] 認証状態:', { 
      isAuthenticated, 
      isLoading, 
      userId: user?.id,
      component: 'GoogleBusinessIntegration'
    });
  }, [isAuthenticated, isLoading, user]);

  useEffect(() => {
    console.log('[GoogleBI検証] コンポーネント状態:', { 
      connectionStatus, 
      hasTokenInfo: Boolean(tokenInfo),
      loading
    });
  }, [connectionStatus, tokenInfo, loading]);

  useEffect(() => {
    if (user?.id) {
      console.log('[GoogleBI検証] ユーザーID変更によるチェック開始:', user.id);
      checkConnectionStatus();
    } else {
      console.log('[GoogleBI検証] ユーザーIDなし、チェックスキップ');
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
    console.error('[GoogleBI] API エラー詳細:', error);
    
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
      clearError(); // エラー状態をクリア
      
      console.log('[GoogleBI] 連携状態確認開始, ユーザーID:', user?.id);
      
      if (!user?.id) {
        console.log('[GoogleBI] ユーザーIDがありません');
        setConnectionStatus('not_connected');
        setLoading(false);
        return;
      }
      
      // テーブルからデータを取得
      console.log('[GoogleBI] google_auth_tokensテーブル確認を開始します');
      
      try {
        // まず、テーブルの存在を確認
        const countResult: any = await supabase
          .from('google_auth_tokens')
          .select('*', { count: 'exact', head: true });
        const count = countResult.count;
        const countError = countResult.error;
          
        if (countError) {
          console.error('[GoogleBI] テーブル確認エラー:', {
            error: countError,
            code: countError.code,
            details: countError.details,
            message: countError.message
          });
        } else {
          console.log('[GoogleBI] テーブル確認結果:', { count });
        }
        
        // テーブル内の最新レコードを確認
        console.log('[GoogleBI] テーブル内の最新レコードを確認します...');
        const { data: allRecords, error: recordsError } = await supabase
          .from('google_auth_tokens')
          .select('id, tenant_id, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(5);
          
        console.log('[GoogleBI] テーブル内レコード:', {
          count: allRecords?.length || 0,
          records: allRecords?.map(record => ({
            id: record.id,
            tenant_id: record.tenant_id,
            createdAt: record.created_at,
            updatedAt: record.updated_at
          })) || [],
          error: recordsError ? {
            code: recordsError.code,
            message: recordsError.message
          } : null
        });
        
        // 複数の方法でトークンを検索
        const testIds = [
          user.id, 
          'ce223858-240b-4888-9087-fddf947dd020', // 固定の開発用ID
          user.id.toLowerCase(), // 小文字に変換
          user.id.toUpperCase() // 大文字に変換
        ];
        
        // 各IDでトークンを検索
        for (const testId of testIds) {
          console.log(`[GoogleBI] ID形式 "${testId.substring(0, 8)}..." でトークンを検索します`);
          const { data: testData, error: testError } = await supabase
            .from('google_auth_tokens')
            .select('id, tenant_id, access_token, updated_at')
            .eq('tenant_id', testId)
            .limit(1);
            
          console.log(`[GoogleBI] ID形式 "${testId.substring(0, 8)}..." の検索結果:`, {
            found: Boolean(testData && testData.length > 0),
            count: testData?.length || 0,
            data: testData && testData.length > 0 ? {
              id: testData[0].id,
              tenant_id: testData[0].tenant_id,
              accessTokenPrefix: testData[0].access_token.substring(0, 10) + '...',
              updatedAt: testData[0].updated_at
            } : null,
            error: testError ? {
              code: testError.code,
              message: testError.message,
              details: testError.details
            } : null
          });
        }
        
        const { data, error } = await supabase
          .from('google_auth_tokens')
          .select('access_token, refresh_token, expiry_date, updated_at, tenant_id')
          .eq('tenant_id', user.id)
          .limit(1);
        
        console.log(`[GoogleBI] ID:${user.id.substring(0, 8)}...でのトークン確認:`, {
          found: Boolean(data && data.length > 0),
          error: error ? {
            code: error.code,
            message: error.message,
            details: error.details
          } : false
        });
        
        // 結果をログ
        console.log('[GoogleBI] トークン確認結果:', { 
          dataExists: Boolean(data && data.length > 0),
          userId: user.id,
          data: data && data.length > 0 ? {
            accessTokenPrefix: data[0].access_token.substring(0, 10) + '...',
            hasRefreshToken: Boolean(data[0].refresh_token),
            expiryDate: data[0].expiry_date,
            updatedAt: data[0].updated_at
          } : null
        });

        if (!data || data.length === 0) {
          console.log('[GoogleBI] トークンが見つかりません');
          setConnectionStatus('not_connected');
          setLoading(false);
          return;
        }
        
        const tokenData = data[0];
        
        // 見つかったデータを使用
        console.log('[GoogleBI] トークンが見つかりました:', {
          tokenPrefix: tokenData.access_token.substring(0, 10) + '...',
          tenant_id: tokenData.tenant_id
        });

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
          // トークンの有効期限切れ
          console.log('[GoogleBI] トークンの有効期限切れ:', { expiry: expiryDate, now });
          handleTokenExpired();
        } else {
          // 正常に接続
          console.log('[GoogleBI] トークンが有効です');
          setConnectionStatus('connected');
          clearError(); // エラーをクリア
          // fetchAccounts();
        }
      } catch (dbError) {
        // 予期せぬエラー
        console.error('[GoogleBI] 予期せぬデータベースエラー:', dbError);
        setErrorMessage('データベース操作中にエラーが発生しました');
        setConnectionStatus('error');
      }
    } catch (error) {
      // 全体的なエラーハンドリング
      console.error('[GoogleBI] 認証状態確認エラー:', error);
      setConnectionStatus('error');
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // 新しいuseEffect: 接続状態が 'connected' になり、アカウント情報がまだない場合にアカウント情報を取得
  useEffect(() => {
    // 自動的にAPIを呼び出すのではなく、ユーザーが明示的に「更新」ボタンを押した時だけデータを取得するよう変更
    // ただし接続状態が変わった場合だけ、フラグをリセット
    if (connectionStatus === 'connected') {
      console.log('[GoogleBI] 接続状態が変更されました。「更新」ボタンでアカウント情報を取得できます。');
      setLoadingAccounts(false);
    }
  }, [connectionStatus]); // 依存配列を修正 - アカウント情報の自動取得をやめる

  const startGoogleAuth = async () => {
    try {
      setAuthenticating(true);
      
      // アクセストークンを取得するURLを作成
      const authUrl = '/api/auth/google-auth';
      
      // 開発環境の場合、ユーザーIDをクエリパラメータとして追加
      const isDevEnv = process.env.NODE_ENV === 'development';
      const apiEndpoint = isDevEnv && user?.id 
        ? `${authUrl}?userId=${user.id}` 
        : authUrl;
      
      console.log('[GoogleBI] API呼び出し:', apiEndpoint);
      
      // リクエスト時のセッション情報をログ出力
      console.log('[GoogleBI] 認証前セッション情報:', {
        userId: user?.id,
        email: user?.email,
        authHeaders: document.cookie ? 'Cookie存在' : 'Cookie未設定',
        cookieDetails: document.cookie ? {
          length: document.cookie.length,
          hasSupabase: document.cookie.includes('supabase'),
          cookieStart: document.cookie.substring(0, 50) + '...'
        } : null
      });
      
      // 認証URLを取得
      console.log('[GoogleBI] リクエスト開始時刻:', new Date().toISOString());
      const response = await fetch(apiEndpoint, {
        credentials: 'include', // クッキーを含める
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          // 開発環境の場合、ヘッダーにもユーザーIDを含める
          ...(isDevEnv && user?.id ? { 'X-User-ID': user.id } : {})
        }
      });
      console.log('[GoogleBI] リクエスト終了時刻:', new Date().toISOString());
      
      // レスポンスの詳細情報をログ出力
      console.log('[GoogleBI] API応答詳細:', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get('content-type'),
          auth: response.headers.get('www-authenticate'),
          date: response.headers.get('date')
        },
        ok: response.ok,
        type: response.type
      });
      
      // レスポンスのステータスコードをチェック
      if (!response.ok) {
        console.error('[GoogleBI] API応答エラー:', response.status, response.statusText);
        
        try {
          const errorData = await response.json();
          console.log('[GoogleBI診断] エラーレスポンス詳細:', errorData);
          
          // APIエラーハンドリング
          handleApiError(errorData, response.status);
        } catch (parseError) {
          // JSONではない場合、テキストとして読み込む
          const errorText = await response.text();
          console.error('[GoogleBI診断] レスポンステキスト:', errorText);
          setErrorMessage(`Google認証の開始に失敗しました: サーバーエラー (${response.status} ${response.statusText})`);
          handleServerError(`APIレスポンスパースエラー: ${response.status} ${response.statusText}`);
        }
        
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }
      
      // 正常なレスポンスの処理
      let data;
      try {
        data = await response.json();
        console.log('[GoogleBI] 認証URL取得結果:', data);
      } catch (parseError) {
        console.error('[GoogleBI] JSONパースエラー:', parseError);
        const errorText = await response.text();
        console.error('[GoogleBI] レスポンステキスト:', errorText.substring(0, 200)); // 最初の200文字だけ表示
        setErrorMessage('Google認証の開始に失敗しました: レスポンスが不正なJSONフォーマットです');
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }
      
      if (data.error) {
        console.error('Google認証エラー:', data);
        setErrorMessage(`Google認証の開始に失敗しました: ${data.error}${data.details ? ` (${data.details})` : ''}`);
        setConnectionStatus('error');
        setAuthenticating(false);
        return;
      }
      
      if (data.url) {
        // 認証ページに遷移
        window.location.href = data.url;
      } else {
        throw new Error('認証URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      handleApiError(error);
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
      setError(null);
      setLoadingAccounts(true); // ロード中フラグを設定
      console.log('[GoogleBusinessIntegration] アカウント情報を取得します');

      // 開発環境の場合、ユーザーIDをクエリパラメータとして追加
      const isDevEnv = process.env.NODE_ENV === 'development';
      const apiEndpoint = isDevEnv && user?.id 
        ? `/api/google-business/accounts?userId=${user.id}` 
        : '/api/google-business/accounts';

      console.log('[GoogleBusinessIntegration] API呼び出し:', apiEndpoint);

      // キャッシュ制御ヘッダーを追加してキャッシュを活用
      const response = await fetch(apiEndpoint, {
        headers: {
          'Cache-Control': 'max-age=300', // 5分間のキャッシュを許可
        }
      });
      
      // レスポンスが成功でない場合、エラー処理
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[GoogleBusinessIntegration] APIエラー:', errorData);
        
        // クォータ制限エラーの場合は特別に処理
        if (response.status === 429) {
          const retryAfter = errorData.retryAfter || 60;
          handleQuotaLimitError(retryAfter);
          
          // クールダウン時間や次回更新可能時間が含まれている場合は表示
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
        console.log('[GoogleBusinessIntegration] アカウントが見つかりません');
        setAccounts([]);
        return;
      }

      // 取得元（API or キャッシュ）を表示
      console.log('[GoogleBusinessIntegration] アカウント情報を取得しました:', 
        data.accounts.length + '件', 
        'ソース:', data.source || 'api'
      );
      
      // forced-cacheの場合は次回更新可能時間を表示
      if (data.source === 'forced-cache' && data.nextRefreshAvailable) {
        const nextTime = new Date(data.nextRefreshAvailable);
        const message = `次回更新可能: ${nextTime.toLocaleString('ja-JP')}（あと約${Math.ceil(data.cooldownSeconds / 60)}分）`;
        setErrorMessage(message);
      } else {
        // エラーメッセージをクリア
        setErrorMessage('');
      }
      
      setAccounts(data.accounts);
    } catch (error: any) {
      console.error('[GoogleBusinessIntegration] エラー:', error);
      setError(error.message || 'アカウント情報の取得に失敗しました');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 強制的に再認証を行う
  const forceReAuthenticate = async () => {
    try {
      setLoading(true);
      
      // トークンを削除
      await supabase
        .from('google_auth_tokens')
        .delete()
        .eq('tenant_id', user?.id);
      
      // 再認証処理を開始
      setConnectionStatus('not_connected');
      setTokenInfo(null);
      setAccounts([]);
      clearError();
      setLoading(false);
      
      // 再認証プロセスを開始
      startGoogleAuth();
    } catch (error) {
      console.error('再認証エラー:', error);
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