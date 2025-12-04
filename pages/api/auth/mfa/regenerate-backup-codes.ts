import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
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
    
    // リクエストボディからユーザーIDを取得（オプション）
    const { userId: requestUserId } = req.body;
    
    // リクエストのユーザーIDとセッションのユーザーIDが一致するか確認
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }
    
    // ユーザーのMFA情報を確認
    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (mfaError || !mfaData) {
      return res.status(404).json({ error: '2要素認証が設定されていません' });
    }
    
    // 新しいバックアップコードを生成
    const backupCodes = Array(10).fill(0).map(() => 
      crypto.randomBytes(4).toString('hex')
    );
    
    // バックアップコードのハッシュを計算
    const hashedBackupCodes = backupCodes.map(code => {
      const hash = crypto.createHash('sha256');
      hash.update(code);
      return hash.digest('hex');
    });
    
    // MFA情報を更新
    const { error: updateError } = await supabase
      .from('user_mfa')
      .update({
        backup_codes: hashedBackupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      logger.error('バックアップコード更新エラー', { error: updateError });
      return res.status(500).json({ error: 'バックアップコードの更新中にエラーが発生しました' });
    }
    
    // 監査ログを記録
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'mfa_backup_codes_regenerated',
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
    logger.error('バックアップコード再生成エラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 