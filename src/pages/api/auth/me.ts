import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return res.status(401).json({
        error: '認証が必要です',
        data: null
      });
    }

    const user = session.user;

    // プロフィール情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // ユーザー情報を返す
    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || null,
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: profile?.role || 'user',
        tenantId: profile?.tenant_id || user.id,
        onboardingCompleted: profile?.onboarding_completed || false,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({
      error: 'ユーザー情報の取得に失敗しました',
      data: null
    });
  }
}
