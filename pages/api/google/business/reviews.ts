import { NextApiRequest, NextApiResponse } from 'next';
import { getReviews } from '@/utils/googleBusinessProfile';
import { withBusinessProfileApiLimit } from '@/middleware/apiLimitMiddleware';
import { logger } from '@/utils/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GETリクエストのみを受け付ける
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId, locationId, pageSize, pageToken, useCache } = req.query;
    
    if (!locationId || typeof locationId !== 'string') {
      return res.status(400).json({ error: '場所IDが必要です' });
    }
    
    // テナントIDを組織IDとする
    const tenantId = organizationId as string;
    
    // ページサイズの処理（デフォルト20件）
    const parsedPageSize = pageSize ? parseInt(pageSize as string, 10) : 20;
    
    // キャッシュを使用するかどうか（デフォルトは使用する）
    const shouldUseCache = useCache !== 'false';
    
    // 最大件数は100件に制限
    const limitedPageSize = Math.min(parsedPageSize, 100);
    
    // レビュー一覧を取得
    const reviews = await getReviews(
      tenantId, 
      locationId, 
      limitedPageSize, 
      typeof pageToken === 'string' ? pageToken : undefined,
      shouldUseCache
    );
    
    // レスポンスヘッダーにキャッシュ情報を追加
    if (shouldUseCache) {
      res.setHeader('X-Cache', 'HIT');
      // レビューは頻繁に更新される可能性があるので短めのキャッシュ時間を設定
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5分
    } else {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'no-cache, no-store');
    }
    
    return res.status(200).json(reviews);
  } catch (error: any) {
    logger.error('レビュー一覧取得エラー', { error });
    
    // エラーメッセージを適切に処理
    if (error.message.includes('Google認証が必要です')) {
      return res.status(401).json({ 
        error: 'Google認証が必要です',
        code: 'google_auth_required',
        redirectUrl: `/api/auth/google?organizationId=${req.query.organizationId}`
      });
    }
    
    // クォータ制限エラーの場合
    if (error.message.includes('Quota exceeded')) {
      return res.status(429).json({ 
        error: 'Googleの使用量制限に達しました。しばらく時間をおいてから再試行してください。',
        code: 'google_quota_exceeded',
        retryAfter: 60 // 60秒後に再試行
      });
    }
    
    return res.status(500).json({ 
      error: 'レビュー一覧の取得中にエラーが発生しました',
      details: error.message
    });
  }
}

// ミドルウェアでラップして使用量制限を適用
export default withBusinessProfileApiLimit(handler); 