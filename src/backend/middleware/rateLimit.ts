import { Request, Response } from 'express';
import { ErrorResponse } from '../types';
import rateLimit from 'express-rate-limit';

// Redis サポート（オプション）
// インストールされている場合のみ使用: npm install rate-limit-redis redis
let RedisStore: any = null;
let redisClient: any = null;

if (process.env.REDIS_URL) {
  try {
    // 動的インポート（Redisが利用可能な場合のみ）
    RedisStore = require('rate-limit-redis').default;
    const { createClient } = require('redis');

    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.connect().catch((err: Error) => {
      console.error('Redis接続エラー:', err);
      redisClient = null;
    });
  } catch (err) {
    console.warn('Redis利用不可 - インメモリストアを使用します');
  }
}

// レート制限の設定値（環境変数で上書き可能）
const RATE_LIMITS = {
  // 認証エンドポイント: 5分で30リクエスト（ブルートフォース攻撃対策）
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || String(5 * 60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '30')
  },
  // APIエンドポイント（認証済み）: 1分で200リクエスト
  apiAuthenticated: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_AUTH_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_API_AUTH_MAX || '200')
  },
  // APIエンドポイント（未認証）: 1分で30リクエスト
  apiPublic: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_PUBLIC_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_API_PUBLIC_MAX || '30')
  },
  // 書き込みエンドポイント: 1分で50リクエスト
  write: {
    windowMs: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_WRITE_MAX || '50')
  }
};

// エラーハンドラー
const rateLimitHandler = (_req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    error: {
      code: '429',
      message: 'リクエスト制限を超えました。しばらく待ってから再度お試しください。'
    }
  };
  res.status(429).json(errorResponse);
};

// Redis ストアを作成する関数
function createRedisStore(prefix: string) {
  if (RedisStore && redisClient) {
    return new RedisStore({
      // @ts-ignore - RedisStore の型定義が古い場合があるため
      client: redisClient,
      prefix: `rl:${prefix}:`
    });
  }
  return undefined;
}

// 標準的なレート制限（認証状態を考慮）
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMITS.apiPublic.windowMs,
  max: (req: Request) => {
    // 認証済みユーザーはより多くのリクエストを許可
    if (req.user) {
      return RATE_LIMITS.apiAuthenticated.max;
    }
    // 未認証ユーザーは制限を厳しく
    return RATE_LIMITS.apiPublic.max;
  },
  standardHeaders: true, // RateLimit-* ヘッダーを返す
  legacyHeaders: false, // X-RateLimit-* ヘッダーを無効化
  handler: rateLimitHandler,
  store: createRedisStore('api')
});

// 認証エンドポイント用のレート制限（より厳しい）
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false, // 成功したリクエストもカウント
  store: createRedisStore('auth')
});

// 書き込みエンドポイント用のレート制限
export const writeRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.write.windowMs,
  max: RATE_LIMITS.write.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  store: createRedisStore('write')
}); 