import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
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
    
    // リクエストボディからデータを取得
    const { userId: requestUserId, secret, token } = req.body;
    
    if (!token || !secret) {
      return res.status(400).json({ error: 'トークンとシークレットが必要です' });
    }
    
    // リクエストのユーザーIDとセッションのユーザーIDが一致するか確認
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }
    
    // トークンの検証
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // 前後の時間枠も許可（30秒ずつ）
    });
    
    if (!verified) {
      return res.status(400).json({ error: '無効なトークンです' });
    }
    
    // バックアップコードを生成
    const backupCodes = Array(10).fill(0).map(() => 
      crypto.randomBytes(4).toString('hex')
    );
    
    // バックアップコードのハッシュを計算
    const hashedBackupCodes = backupCodes.map(code => {
      const hash = crypto.createHash('sha256');
      hash.update(code);
      return hash.digest('hex');
    });
    
    // MFAセットアップの完了と本登録
    const { error: mfaError } = await supabase
      .from('user_mfa')
      .upsert([{
        id: uuidv4(),
        user_id: userId,
        secret: secret,
        backup_codes: hashedBackupCodes,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      });
    
    if (mfaError) {
      logger.error('MFA登録エラー', { error: mfaError });
      return res.status(500).json({ error: 'MFAの登録中にエラーが発生しました' });
    }
    
    // セットアップ情報を削除
    await supabase
      .from('user_mfa_setup')
      .delete()
      .eq('user_id', userId);
    
    // 監査ログを記録
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'mfa_enabled',
      resource_type: 'user',
      resource_id: userId,
      details: JSON.stringify({
        timestamp: new Date().toISOString()
      })
    }]);
    
    return res.status(200).json({
      success: true,
      backupCodes
    });
  } catch (error: any) {
    logger.error('MFA検証エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 