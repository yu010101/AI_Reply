import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// レート制限用のストア（本番環境ではRedisなどの外部ストアを使用推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// レート制限の設定（環境変数で上書き可能、本番環境向けに調整済み）
const RATE_LIMIT_WINDOWS = {
  // 認証エンドポイント: 5分で30リクエスト（10から引き上げ - 正常な再試行を考慮）
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || String(5 * 60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '30')
  },
  // APIエンドポイント: 1分で200リクエスト（60から引き上げ - SPAの複数リクエストを考慮）
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_API_MAX || '200')
  },
  // 書き込みエンドポイント: 1分で50リクエスト（20から引き上げ - バッチ操作を考慮）
  write: {
    windowMs: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_WRITE_MAX || '50')
  },
  // Webhookエンドポイント: 1分で300リクエスト（100から引き上げ - 外部サービスのバースト対応）
  webhook: {
    windowMs: parseInt(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS || String(60 * 1000)),
    max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX || '300')
  }
};

// Redis設定（Edge Runtimeでは利用不可のため、インメモリストアを使用）
// 本番環境では@upstash/redisなどのEdge互換のRedisクライアントを使用することを推奨
const REDIS_ENABLED = false; // Edge Runtimeでは常にfalse
let redisClient: any = null;

// IPアドレスを取得する関数
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

// Redisを使用したレート制限チェック
async function checkRateLimitRedis(
  key: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const resetTime = now + windowMs;
    const redisKey = `rate_limit:${key}`;

    // Redisパイプラインで原子的に処理
    const count = await redisClient.incr(redisKey);

    if (count === 1) {
      // 新しいキーの場合、有効期限を設定
      await redisClient.pExpire(redisKey, windowMs);
    }

    const ttl = await redisClient.pTTL(redisKey);
    const actualResetTime = ttl > 0 ? now + ttl : resetTime;

    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetTime: actualResetTime
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Redisエラー時はインメモリストアにフォールバック
    return checkRateLimitMemory(key, windowMs, max);
  }
}

// インメモリストアを使用したレート制限チェック
function checkRateLimitMemory(
  key: string,
  windowMs: number,
  max: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const fullKey = `rate_limit:${key}`;

  const record = rateLimitStore.get(fullKey);

  if (!record || now > record.resetTime) {
    // 新しいウィンドウを開始
    const resetTime = now + windowMs;
    rateLimitStore.set(fullKey, { count: 1, resetTime });

    // 古いレコードをクリーンアップ（メモリリーク防止）
    if (rateLimitStore.size > 10000) {
      const entriesToDelete: string[] = [];
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetTime) {
          entriesToDelete.push(k);
        }
      }
      entriesToDelete.forEach(k => rateLimitStore.delete(k));
    }

    return { allowed: true, remaining: max - 1, resetTime };
  }

  if (record.count >= max) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { allowed: true, remaining: max - record.count, resetTime: record.resetTime };
}

// レート制限をチェックする関数（RedisまたはMemoryを自動選択）
async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (REDIS_ENABLED && redisClient && redisClient.isOpen) {
    return await checkRateLimitRedis(key, windowMs, max);
  }
  return checkRateLimitMemory(key, windowMs, max);
}

export async function middleware(request: NextRequest) {
  // APIルートのみにレート制限を適用
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // デバッグエンドポイントは開発環境でのみ許可
    if (request.nextUrl.pathname.startsWith('/api/debug/')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }
    }

    const ip = getClientIp(request);
    const method = request.method;
    let limitConfig = RATE_LIMIT_WINDOWS.api;
    let keyPrefix = 'api';

    // Webhookエンドポイント - 専用のレート制限を適用
    if (
      request.nextUrl.pathname.startsWith('/api/webhooks/') ||
      request.nextUrl.pathname === '/api/subscriptions/webhook'
    ) {
      limitConfig = RATE_LIMIT_WINDOWS.webhook;
      keyPrefix = 'webhook';
    }
    // 認証エンドポイント - より厳しいレート制限（ブルートフォース攻撃対策）
    else if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      limitConfig = RATE_LIMIT_WINDOWS.auth;
      keyPrefix = 'auth';
    }
    // 書き込みエンドポイント - POST/PUT/DELETE等
    else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      limitConfig = RATE_LIMIT_WINDOWS.write;
      keyPrefix = 'write';
    }

    const rateLimit = await checkRateLimit(
      `${keyPrefix}:${ip}`,
      limitConfig.windowMs,
      limitConfig.max
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `レート制限を超えました。${keyPrefix}エンドポイントは${limitConfig.windowMs / 1000}秒あたり${limitConfig.max}リクエストまでです。`,
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limitConfig.max),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000))
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(limitConfig.max));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.resetTime / 1000)));
    return response;
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパス
export const config = {
  matcher: '/api/:path*',
};
