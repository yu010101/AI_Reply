import { NextApiRequest, NextApiResponse } from 'next';
import { getLocations } from '@/utils/googleBusinessProfile';
import { withBusinessProfileApiLimit } from '@/middleware/apiLimitMiddleware';
import { logger } from '@/utils/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GETリクエストのみを受け付ける
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId, accountId, useCache } = req.query;
    
    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'アカウントIDが必要です' });
    }
    
    // テナントIDを組織IDとする（現在の設計では同一のものとして扱う）
    const tenantId = organizationId as string;
    
    // キャッシュを使用するかどうか（デフォルトは使用する）
    const shouldUseCache = useCache !== 'false';
    
    // 場所一覧を取得
    const locations = await getLocations(tenantId, accountId, shouldUseCache);
    
    // レスポンスヘッダーにキャッシュ情報を追加
    if (shouldUseCache) {
      res.setHeader('X-Cache', 'HIT');
      // キャッシュの有効期限を1時間に設定
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'no-cache, no-store');
    }
    
    return res.status(200).json({ locations });
  } catch (error: any) {
    logger.error('場所一覧取得エラー', { error });
    
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
      error: '場所一覧の取得中にエラーが発生しました',
      details: error.message
    });
  }
}

// ミドルウェアでラップして使用量制限を適用
export default withBusinessProfileApiLimit(handler); 