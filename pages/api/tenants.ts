import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    logger.debug('テナント一覧取得リクエスト');
    
    // 認証トークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('認証トークンがありません');
      return res.status(401).json({ error: '認証トークンが必要です' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('認証トークンの形式が不正です');
      return res.status(401).json({ error: '認証トークンの形式が不正です' });
    }

    // トークンを検証
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logger.error('認証エラー', { error: authError });
      return res.status(401).json({ error: '認証に失敗しました' });
    }

    logger.debug('認証成功', { email: user.email });

    // テナント一覧を取得
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      logger.error('テナント取得エラー', { error: tenantsError });
      return res.status(500).json({ error: 'テナントの取得に失敗しました' });
    }

    logger.info('テナント一覧取得成功', { count: tenants?.length || 0 });
    return res.status(200).json({ data: tenants });
  } catch (error) {
    logger.error('予期せぬエラー', { error });
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
} 