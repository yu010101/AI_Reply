import { NextApiRequest, NextApiResponse } from 'next';
import { replyToReview } from '@/utils/googleBusinessProfile';
import { withBusinessProfileApiLimit } from '@/middleware/apiLimitMiddleware';
import { incrementUsage, ResourceType } from '@/models/UsageLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POSTリクエストのみを受け付ける
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId } = req.query;
    const { reviewId, replyText } = req.body;
    
    if (!reviewId || typeof reviewId !== 'string') {
      return res.status(400).json({ error: 'レビューIDが必要です' });
    }
    
    if (!replyText || typeof replyText !== 'string') {
      return res.status(400).json({ error: '返信内容が必要です' });
    }
    
    // テナントIDを組織IDとする
    const tenantId = organizationId as string;
    
    // 返信は重要なアクションなので、API使用量を2カウント分消費する
    await incrementUsage(tenantId, ResourceType.API_CALLS, 2);
    
    // レビューに返信
    const result = await replyToReview(tenantId, reviewId, replyText);
    
    return res.status(200).json({ 
      success: true,
      reply: result
    });
  } catch (error: any) {
    console.error('レビュー返信エラー:', error);
    
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
    
    // 詳細なエラー情報を提供
    return res.status(500).json({ 
      error: 'レビュー返信中にエラーが発生しました',
      code: 'reply_failed',
      details: error.message,
      reviewId: req.body.reviewId
    });
  }
}

// ミドルウェアでラップして使用量制限を適用
export default withBusinessProfileApiLimit(handler); 