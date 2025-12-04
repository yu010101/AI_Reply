import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// レート制限用のストア（本番環境ではRedisなどの外部ストアを使用推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// レート制限の設定
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分
const RATE_LIMIT_MAX = 100; // IPアドレスごとの最大リクエスト数

// IPアドレスを取得する関数
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

// レート制限をチェックする関数
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // 新しいウィンドウを開始
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    
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
    
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetTime: record.resetTime };
}

export function middleware(request: NextRequest) {
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
    
    // Webhookエンドポイントはレート制限をスキップ（Stripe署名検証で保護）
    if (request.nextUrl.pathname === '/api/subscriptions/webhook') {
      return NextResponse.next();
    }
    
    // 認証エンドポイントはより緩いレート制限を適用
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      // 認証エンドポイントは別のレート制限を適用（ここでは同じ制限を使用）
      const ip = getClientIp(request);
      const rateLimit = checkRateLimit(`auth:${ip}`);
      
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { 
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
              'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000))
            }
          }
        );
      }
      
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.resetTime / 1000)));
      return response;
    }
    
    // その他のAPIエンドポイントにレート制限を適用
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000))
          }
        }
      );
    }
    
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
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
