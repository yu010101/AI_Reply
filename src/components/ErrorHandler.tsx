import React from 'react';
import Link from 'next/link';
import { Alert, AlertTitle, Button, Typography, Box, LinearProgress } from '@mui/material';

interface ApiErrorProps {
  error: any;
  onRetry?: () => void;
}

// API制限エラーのコンポーネント
export const ApiLimitError: React.FC<ApiErrorProps> = ({ error, onRetry }) => {
  if (!error || !error.code || error.code !== 'api_limit_exceeded') {
    return null;
  }

  return (
    <Alert severity="warning" sx={{ mb: 3 }}>
      <AlertTitle>API利用上限に達しました</AlertTitle>
      <Typography variant="body2" sx={{ mb: 2 }}>
        本日のAPI利用回数上限（{error.limit}回）に達しました。
        明日までお待ちいただくか、上位プランへのアップグレードをご検討ください。
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={100}
            color="warning"
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {error.current}/{error.limit}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {onRetry && (
          <Button 
            size="small" 
            onClick={onRetry}
            variant="outlined"
          >
            再試行
          </Button>
        )}
        {error.upgradeUrl && (
          <Button 
            size="small" 
            color="primary" 
            variant="contained"
            component={Link}
            href={error.upgradeUrl}
          >
            プランをアップグレード
          </Button>
        )}
      </Box>
    </Alert>
  );
};

// Google API制限エラーのコンポーネント
export const GoogleQuotaError: React.FC<ApiErrorProps> = ({ error, onRetry }) => {
  if (!error || !error.code || error.code !== 'google_quota_exceeded') {
    return null;
  }

  // 再試行までの時間（デフォルト60秒）
  const retryAfter = error.retryAfter || 60;

  return (
    <Alert severity="error" sx={{ mb: 3 }}>
      <AlertTitle>Google APIの利用制限に達しました</AlertTitle>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Googleの利用制限に達しました。これはGoogle側の制限であり、しばらく待ってから再試行する必要があります。
        通常、{retryAfter}秒後に再試行できます。
      </Typography>
      {onRetry && (
        <Button 
          size="small" 
          onClick={onRetry}
          variant="contained"
        >
          再試行
        </Button>
      )}
    </Alert>
  );
};

// Google認証エラーのコンポーネント
export const GoogleAuthError: React.FC<ApiErrorProps> = ({ error }) => {
  if (!error || !error.code || error.code !== 'google_auth_required') {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <AlertTitle>Google認証が必要です</AlertTitle>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Googleビジネスプロフィールにアクセスするための認証が必要です。
        「Googleで認証」ボタンをクリックして、必要な権限を付与してください。
      </Typography>
      {error.redirectUrl && (
        <Button 
          size="small" 
          color="primary" 
          variant="contained"
          component={Link}
          href={error.redirectUrl}
        >
          Googleで認証
        </Button>
      )}
    </Alert>
  );
};

// 汎用エラーハンドラーコンポーネント
export const ApiErrorHandler: React.FC<ApiErrorProps> = ({ error, onRetry }) => {
  if (!error) return null;

  // エラーコードに基づいて適切なエラーコンポーネントを表示
  switch (error.code) {
    case 'api_limit_exceeded':
      return <ApiLimitError error={error} onRetry={onRetry} />;
    case 'google_quota_exceeded':
      return <GoogleQuotaError error={error} onRetry={onRetry} />;
    case 'google_auth_required':
      return <GoogleAuthError error={error} />;
    default:
      // デフォルトのエラー表示
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラーが発生しました</AlertTitle>
          <Typography variant="body2">
            {error.error || error.message || 'リクエスト処理中にエラーが発生しました。'}
          </Typography>
          {onRetry && (
            <Button 
              size="small" 
              onClick={onRetry}
              variant="outlined"
              sx={{ mt: 1 }}
            >
              再試行
            </Button>
          )}
        </Alert>
      );
  }
}; 