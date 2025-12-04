import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * 認証が必要なAPIエンドポイント用のミドルウェア
 * セッションを確認し、認証されていない場合は401エラーを返す
 */
export const requireAuth = (handler: ApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.warn('セッション取得エラー', { error: sessionError });
        return res.status(401).json({ error: '認証に失敗しました' });
      }
      
      if (!session) {
        logger.debug('認証されていないリクエスト', { path: req.url });
        return res.status(401).json({ error: '認証されていません' });
      }
      
      // セッション情報をリクエストに追加（後続のハンドラーで使用可能）
      (req as any).user = session.user;
      (req as any).session = session;
      
      return handler(req, res);
    } catch (error) {
      logger.error('認証ミドルウェアエラー', { error });
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  };
};

/**
 * 特定のロールのみアクセス可能なAPIエンドポイント用のミドルウェア
 * @param allowedRoles 許可するロールの配列
 */
export const requireRole = (allowedRoles: string[]) => {
  return (handler: ApiHandler) => {
    return requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        const user = (req as any).user;
        
        if (!user) {
          return res.status(401).json({ error: '認証されていません' });
        }
        
        // ユーザーのロールを取得（organization_usersテーブルから）
        const { data: orgUser, error: orgError } = await supabase
          .from('organization_users')
          .select('role_id, roles(name)')
          .eq('user_id', user.id)
          .single();
        
        if (orgError || !orgUser) {
          logger.warn('ロール取得エラー', { error: orgError, userId: user.id });
          return res.status(403).json({ error: '権限がありません' });
        }
        
        const userRole = (orgUser.roles as any)?.name;
        
        if (!userRole || !allowedRoles.includes(userRole)) {
          logger.warn('権限不足', { 
            userId: user.id, 
            userRole, 
            allowedRoles 
          });
          return res.status(403).json({ error: 'この操作を実行する権限がありません' });
        }
        
        return handler(req, res);
      } catch (error) {
        logger.error('ロールチェックミドルウェアエラー', { error });
        return res.status(500).json({ error: 'サーバーエラーが発生しました' });
      }
    });
  };
};

/**
 * 組織へのアクセス権限をチェックするミドルウェア
 * リクエストからorganizationIdを取得し、ユーザーがその組織に所属しているか確認
 */
export const requireOrganizationAccess = (handler: ApiHandler) => {
  return requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = (req as any).user;
      
      // リクエストから組織IDを取得（クエリまたはボディから）
      const organizationId = req.query.organizationId as string || req.body?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ error: '組織IDが必要です' });
      }
      
      // ユーザーがこの組織に所属しているか確認
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id, role_id')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();
      
      if (orgError || !orgUser) {
        logger.warn('組織アクセス権限なし', { 
          userId: user.id, 
          organizationId, 
          error: orgError 
        });
        return res.status(403).json({ error: 'この組織へのアクセス権がありません' });
      }
      
      // 組織情報をリクエストに追加
      (req as any).organizationId = organizationId;
      (req as any).orgUser = orgUser;
      
      return handler(req, res);
    } catch (error) {
      logger.error('組織アクセスチェックミドルウェアエラー', { error });
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  });
};
