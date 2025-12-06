import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';

// レート制限の設定（環境変数で上書き可能、本番環境向けに調整）
const limiter = process.env.NODE_ENV === 'test'
  ? (req: NextApiRequest, res: NextApiResponse, next: any) => {
      const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress;
      const key = `${ip}:${req.method}:${req.url}`;
      const count = (global as any).rateLimitCount = ((global as any).rateLimitCount || 0) + 1;

      if (count > 100) {
        const err: any = new Error('Too many requests');
        err.statusCode = 429;
        err.code = 'RATE_LIMIT_EXCEEDED';
        return next(err);
      }

      next();
    }
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'), // デフォルト1分（15分から変更）
      max: parseInt(process.env.RATE_LIMIT_API_MAX || '200'), // デフォルト200リクエスト/分（100から変更）
      message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true, // RateLimit-* ヘッダーを返す
      legacyHeaders: false, // X-RateLimit-* ヘッダーを無効化
    });

// セキュリティログの型定義
type SecurityLog = {
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  userAgent?: string;
  userId?: string;
  error?: string;
};

// IPアドレスを取得する関数
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  return req.socket?.remoteAddress || 'unknown';
}

// セキュリティイベントをログに記録する関数
async function logSecurityEvent(log: SecurityLog) {
  try {
    await supabase.from('security_logs').insert(log);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// セキュリティミドルウェア
export function securityMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = getClientIp(req);
    const userAgent = req.headers?.['user-agent'];
    const path = req.url || '';

    try {
      // レート制限の適用
      await new Promise<void>((resolve, reject) => {
        const next = (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        limiter(req as any, res as any, next);
      });

      // リクエストの処理
      await handler(req, res);

      // 成功時のログ記録
      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        ip,
        method: req.method || '',
        path,
        status: res.statusCode,
        userAgent,
        userId: req.user?.id,
      });
    } catch (error: any) {
      // エラー時のログ記録
      await logSecurityEvent({
        timestamp: new Date().toISOString(),
        ip,
        method: req.method || '',
        path,
        status: error.statusCode || 500,
        userAgent,
        userId: req.user?.id,
        error: error.message,
      });

      // エラーレスポンスを返す
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code || 'INTERNAL_ERROR',
      });
    }
  };
} 