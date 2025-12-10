import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: '認証されていません', data: null });
    }

    const userId = session.user.id;

    // サブスクリプション情報を取得
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'サブスクリプション情報の取得に失敗しました', data: null });
    }

    // サブスクリプションが存在しない場合はデフォルト値を返す
    if (!subscription) {
      return res.status(200).json({
        data: {
          id: null,
          plan: 'free',
          status: 'active',
          startDate: null,
          endDate: null,
        },
      });
    }

    res.status(200).json({
      data: {
        id: subscription.id,
        plan: subscription.plan || 'free',
        status: subscription.status || 'active',
        startDate: subscription.start_date,
        endDate: subscription.end_date,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました', data: null });
  }
}
