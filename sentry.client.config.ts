import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV || 'development',
  
  // リリース情報
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
  
  // トレーシング設定（本番環境では5%に削減してノイズを減らす）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // セッションリプレイ設定（本番環境では2%に削減）
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 1.0,
  replaysOnErrorSampleRate: 0.5, // エラー時も50%に削減してノイズを減らす
  
  // 機密情報のフィルタリング
  beforeSend(event, hint) {
    // 機密情報をマスク
    if (event.request) {
      // クエリパラメータから機密情報を削除
      if (event.request.query_string) {
        const queryString = typeof event.request.query_string === 'string' 
          ? event.request.query_string 
          : String(event.request.query_string);
        const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'access_token', 'refresh_token'];
        sensitiveKeys.forEach(key => {
          if (queryString.includes(key) && event.request) {
            event.request.query_string = '[Filtered]';
          }
        });
      }
      
      // ヘッダーから機密情報を削除
      if (event.request.headers && event.request) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          if (event.request?.headers?.[header]) {
            event.request.headers[header] = '[Filtered]';
          }
        });
      }
    }
    
    return event;
  },
  
  // エラーの重要度を設定
  beforeSendTransaction(event) {
    // パフォーマンス監視用のトランザクション
    return event;
  },
  
  // 無視するエラー（ノイズ削減のため拡張）
  ignoreErrors: [
    // ブラウザ拡張機能によるエラー
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    // ネットワークエラー（オフライン時など）
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    'AbortError',
    'TimeoutError',
    // ユーザーによるキャンセル
    'The user aborted a request',
    'user cancelled',
    // 一般的なブラウザエラー
    'Script error',
    'Loading chunk',
    'ChunkLoadError',
    // Safari固有のエラー
    'cancelled',
    "The operation couldn't be completed",
    // Chrome拡張機能
    'chrome-extension://',
    'moz-extension://',
    // 広告ブロッカー関連
    'adsbygoogle',
  ],
  
  // 統合設定（Next.jsが自動的に設定）
});
