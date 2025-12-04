import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

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
    
    // リクエストボディから招待トークンを取得
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: '招待トークンが不足しています' });
    }
    
    // 招待の有効性を確認
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (inviteError || !invitation) {
      return res.status(404).json({ error: '有効な招待が見つかりません' });
    }
    
    // 招待の有効期限をチェック
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: '招待の有効期限が切れています' });
    }
    
    // ユーザーのメールアドレスと招待のメールアドレスが一致するか確認
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (userData?.email !== invitation.email) {
      return res.status(403).json({ 
        error: '招待されたメールアドレスとログイン中のアカウントが一致しません' 
      });
    }
    
    // ユーザーが既にこの組織に所属しているか確認
    const { data: existingMember } = await supabase
      .from('organization_users')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId)
      .single();
    
    if (existingMember) {
      // 招待ステータスを更新
      await supabase
        .from('invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      return res.status(200).json({
        success: true,
        message: 'あなたは既にこの組織のメンバーです',
        organizationId: invitation.organization_id
      });
    }
    
    // ユーザーを組織に追加
    const { error: memberError } = await supabase
      .from('organization_users')
      .insert([{
        organization_id: invitation.organization_id,
        user_id: userId,
        role_id: invitation.role_id
      }]);
    
    if (memberError) {
      logger.error('組織メンバー追加エラー', { error: memberError });
      return res.status(500).json({ error: '組織への参加に失敗しました' });
    }
    
    // 招待ステータスを更新
    await supabase
      .from('invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);
    
    // 監査ログを記録
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action: 'organization_join',
        resource_type: 'organization',
        resource_id: invitation.organization_id,
        details: JSON.stringify({
          invitation_id: invitation.id,
          role_id: invitation.role_id
        })
      }]);
    
    return res.status(200).json({
      success: true,
      message: '組織に正常に参加しました',
      organizationId: invitation.organization_id
    });
  } catch (error: any) {
    logger.error('招待受諾エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 