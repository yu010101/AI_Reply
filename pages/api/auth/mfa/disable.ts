import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }
    
    const userId = session.user.id;
    
    // リクエストボディからユーザーIDを取得（オプション）
    const { userId: requestUserId } = req.body;
    
    // リクエストのユーザーIDとセッションのユーザーIDが一致するか確認
    if (requestUserId && requestUserId !== userId) {
      // 管理者かどうかを確認（必要に応じて）
      const { data: adminCheck, error: adminError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (adminError || adminCheck?.role !== 'admin') {
        return res.status(403).json({ error: '権限がありません' });
      }
    }
    
    // ユーザーのMFA情報を確認
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', requestUserId || userId)
      .single();
    
    if (mfaError || !mfaData) {
      return res.status(404).json({ error: '2要素認証が設定されていません' });
    }
    
    // MFA情報を削除
    const { error: deleteError } = await supabase
      .from('user_mfa')
      .delete()
      .eq('user_id', requestUserId || userId);
    
    if (deleteError) {
      console.error('MFA削除エラー:', deleteError);
      return res.status(500).json({ error: 'MFAの削除中にエラーが発生しました' });
    }
    
    // 監査ログを記録
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'mfa_disabled',
      resource_type: 'user',
      resource_id: requestUserId || userId,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        disabled_by: userId
      })
    }]);
    
    return res.status(200).json({
      success: true,
      message: '2要素認証が無効化されました'
    });
  } catch (error: any) {
    console.error('MFA無効化エラー:', error);
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 