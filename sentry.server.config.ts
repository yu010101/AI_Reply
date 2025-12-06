import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV || 'development',
  
  // リリース情報
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
  
  // トレーシング設定（本番環境では5%に削減してノイズを減らす）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
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
      
      // ボディから機密情報を削除
      if (event.request && event.request.data) {
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'accessToken', 'refreshToken'];
        const requestData = event.request.data as Record<string, any>;
        sensitiveFields.forEach(field => {
          if (requestData && typeof requestData === 'object' && field in requestData) {
            requestData[field] = '[Filtered]';
          }
        });
      }
    }
    
    return event;
  },
  
  // 無視するエラー（ノイズ削減のため拡張）
  ignoreErrors: [
    // データベース接続エラー（一時的なもの）
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
    // レート制限エラー（正常な動作）
    'RATE_LIMIT_EXCEEDED',
    '429',
    // クライアント側の検証エラー（正常な動作）
    'VALIDATION_ERROR',
    'INVALID_INPUT',
    // 正常な404エラー
    'NOT_FOUND',
    'RESOURCE_NOT_FOUND',
    // 想定されるビジネスロジックエラー
    'Unauthorized',
    'Forbidden',
    // 一時的なネットワークエラー
    'NetworkError',
    'Failed to fetch',
    'AbortError',
  ],
  
  // 統合設定（Next.jsが自動的に設定）
});
