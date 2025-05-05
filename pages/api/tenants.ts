import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('[API] テナント一覧取得リクエスト');
    
    // 認証トークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('[API] 認証トークンがありません');
      return res.status(401).json({ error: '認証トークンが必要です' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('[API] 認証トークンの形式が不正です');
      return res.status(401).json({ error: '認証トークンの形式が不正です' });
    }

    // トークンを検証
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[API] 認証エラー:', authError);
      return res.status(401).json({ error: '認証に失敗しました' });
    }

    console.log('[API] 認証成功:', user.email);

    // テナント一覧を取得
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('[API] テナント取得エラー:', tenantsError);
      return res.status(500).json({ error: 'テナントの取得に失敗しました' });
    }

    console.log('[API] テナント一覧取得成功:', tenants);
    return res.status(200).json({ data: tenants });
  } catch (error) {
    console.error('[API] 予期せぬエラー:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
} 