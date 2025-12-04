import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // ユーザー認証を確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    // オンボーディング完了フラグを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('オンボーディング完了フラグの更新エラー:', updateError);
      return res.status(500).json({ 
        message: 'オンボーディングの完了処理に失敗しました',
        error: updateError.message 
      });
    }

    return res.status(200).json({ 
      message: 'オンボーディングが完了しました',
      onboarding_completed: true 
    });
  } catch (error: any) {
    console.error('オンボーディング完了エラー:', error);
    return res.status(500).json({ 
      message: 'サーバーエラーが発生しました',
      error: error.message 
    });
  }
}
