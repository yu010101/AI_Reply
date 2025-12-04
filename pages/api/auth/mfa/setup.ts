import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
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
    
    // リクエストボディからユーザーIDを取得（オプション）
    const { userId: requestUserId } = req.body;
    
    // リクエストのユーザーIDとセッションのユーザーIDが一致するか確認
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }
    
    // ユーザーが既に2FAを設定しているか確認
    const { data: existingMfa, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingMfa) {
      return res.status(400).json({ error: '2要素認証は既に設定されています' });
    }
    
    // 新しいシークレットとQRコードURLを生成
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `AI Reply:${session.user.email}`
    });
    
    const qrCodeUrl = secret.otpauth_url;
    
    // 一時的なセットアップ情報をデータベースに保存
    const { error: setupError } = await supabase
      .from('user_mfa_setup')
      .upsert([{
        id: uuidv4(),
        user_id: userId,
        secret: secret.base32,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      });
    
    if (setupError) {
      logger.error('MFAセットアップエラー', { error: setupError });
      return res.status(500).json({ error: 'MFAの設定中にエラーが発生しました' });
    }
    
    // 監査ログを記録
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'mfa_setup_started',
      resource_type: 'user',
      resource_id: userId,
      details: JSON.stringify({
        timestamp: new Date().toISOString()
      })
    }]);
    
    return res.status(200).json({
      success: true,
      qrCodeUrl,
      secret: secret.base32
    });
  } catch (error: any) {
    logger.error('MFA設定エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 