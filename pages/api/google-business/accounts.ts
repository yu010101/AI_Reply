import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { getAccounts } from '@/utils/googleBusinessProfile';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = session.user.id;

    // トークンを確認
    const { data: tokenData } = await supabase
      .from('google_auth_tokens')
      .select('access_token')
      .eq('tenant_id', userId)
      .single();

    if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({ error: 'Google Business Profileとの連携が必要です' });
    }

    try {
      // アカウント情報を取得
      const accounts = await getAccounts(userId);
      
      // アカウント情報をキャッシュ
      if (accounts.length > 0) {
        // 既存のアカウント情報を削除
        await supabase
          .from('google_business_accounts')
          .delete()
          .eq('tenant_id', userId);
        
        // 新しいアカウント情報を保存
        await supabase
          .from('google_business_accounts')
          .insert(
            accounts.map(account => ({
              tenant_id: userId,
              account_id: account.name.split('/').pop(),
              account_name: account.accountName,
              display_name: account.displayName,
              primary_owner: account.primaryOwner,
              type: account.type,
              role: account.role,
              created_at: new Date().toISOString()
            }))
          );
      }
      
      return res.status(200).json({ accounts });
    } catch (error: any) {
      console.error('アカウント情報取得エラー:', error);
      
      // キャッシュされたアカウント情報を返す
      const { data: cachedAccounts } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);
      
      if (cachedAccounts && cachedAccounts.length > 0) {
        return res.status(200).json({ 
          accounts: cachedAccounts,
          cached: true,
          error: error.message
        });
      }
      
      return res.status(500).json({ error: error.message || 'アカウント情報の取得に失敗しました' });
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 