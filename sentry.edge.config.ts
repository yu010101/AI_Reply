import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 環境設定
  environment: process.env.NODE_ENV || 'development',
  
  // トレーシング設定（本番環境では5%に削減してノイズを減らす）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  // 機密情報のフィルタリング
  beforeSend(event) {
    // 機密情報をマスク
    if (event.request && event.request.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      sensitiveHeaders.forEach(header => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = '[Filtered]';
        }
      });
    }
    
    return event;
  },
});
