import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { checkUsageLimit, ResourceType } from '@/models/UsageLimit';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

// 使用量エラーレスポンス
interface UsageLimitError {
  error: string;
  code: string;
  current: number;
  limit: number;
  remainingPercentage: number;
  upgradeUrl?: string;
}

// APIリミットチェックミドルウェア
export const withApiLimit = (handler: ApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return res.status(401).json({ error: '認証されていません' });
      }
      
      // リクエストから組織IDを取得
      const { organizationId } = req.query;
      
      if (!organizationId || typeof organizationId !== 'string') {
        return res.status(400).json({ error: '組織IDが必要です' });
      }
      
      // ユーザーがこの組織に所属しているか確認
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('organization_id', organizationId)
        .eq('user_id', session.user.id)
        .single();
        
      if (!orgUser) {
        return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
      }
      
      // API使用量をチェック
      const usageCheck = await checkUsageLimit(
        organizationId,
        ResourceType.API_CALLS,
        true // チェック時に使用量をインクリメント
      );
      
      if (!usageCheck.allowed) {
        // 制限を超えている場合はエラーレスポンス
        const error: UsageLimitError = {
          error: 'API使用量の上限に達しました',
          code: 'api_limit_exceeded',
          current: usageCheck.current,
          limit: usageCheck.limit,
          remainingPercentage: usageCheck.remainingPercentage,
          upgradeUrl: `/settings/billing?org=${organizationId}`
        };
        
        return res.status(429).json(error);
      }
      
      // 使用量が80%を超えている場合は警告ヘッダーを追加
      if (usageCheck.remainingPercentage < 20) {
        res.setHeader('X-API-Limit-Warning', `使用量が${usageCheck.current}/${usageCheck.limit}に達しています`);
      }
      
      // すべてのチェックが通過したら元のハンドラーを実行
      return handler(req, res);
    } catch (error) {
      console.error('API制限ミドルウェアエラー:', error);
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  };
};

// 組織IDをリクエストクエリから取得（req.bodyから取得する場合にも対応）
export const getOrganizationIdFromRequest = (req: NextApiRequest): string | null => {
  // URLクエリから取得
  const { organizationId } = req.query;
  if (organizationId && typeof organizationId === 'string') {
    return organizationId;
  }
  
  // POSTリクエストのボディから取得
  if (req.body && req.body.organizationId) {
    return req.body.organizationId;
  }
  
  return null;
};

// よく使われるAPIエンドポイント用の高階ミドルウェア
export const withBusinessProfileApiLimit = (handler: ApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return res.status(401).json({ error: '認証されていません' });
      }
      
      // リクエストから組織IDを取得（クエリまたはボディから）
      const organizationId = getOrganizationIdFromRequest(req);
      
      if (!organizationId) {
        return res.status(400).json({ error: '組織IDが必要です' });
      }
      
      // ユーザーがこの組織に所属しているか確認
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('organization_id', organizationId)
        .eq('user_id', session.user.id)
        .single();
        
      if (!orgUser) {
        return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
      }
      
      // API使用量をチェック
      const usageCheck = await checkUsageLimit(
        organizationId,
        ResourceType.API_CALLS,
        true // チェック時に使用量をインクリメント
      );
      
      if (!usageCheck.allowed) {
        // 制限を超えている場合はわかりやすいエラーメッセージと対応策を提示
        const error: UsageLimitError = {
          error: '今日のAPI使用量の上限に達しました',
          code: 'api_limit_exceeded',
          current: usageCheck.current,
          limit: usageCheck.limit,
          remainingPercentage: usageCheck.remainingPercentage,
          upgradeUrl: `/settings/billing?org=${organizationId}`
        };
        
        // 残りリクエスト数を0に設定
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Limit', String(usageCheck.limit));
        
        // リセット時間を設定（翌日0時）
        const resetTime = new Date();
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
        res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString());
        
        return res.status(429).json(error);
      }
      
      // 残りリクエスト数を設定
      const remaining = usageCheck.limit - usageCheck.current;
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
      res.setHeader('X-RateLimit-Limit', String(usageCheck.limit));
      
      // 使用量が80%を超えている場合は警告ヘッダーを追加
      if (usageCheck.remainingPercentage < 20) {
        res.setHeader('X-API-Limit-Warning', `使用量が${usageCheck.current}/${usageCheck.limit}に達しています`);
      }
      
      // すべてのチェックが通過したら元のハンドラーを実行
      return handler(req, res);
    } catch (error) {
      console.error('Business Profile API制限ミドルウェアエラー:', error);
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  };
}; 