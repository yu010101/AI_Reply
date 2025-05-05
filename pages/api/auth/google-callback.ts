import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { google } from 'googleapis';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.redirect('/auth/login?error=auth_required');
    }

    const userId = session.user.id;
    const { code, state } = req.query;

    // stateパラメータを確認（CSRF保護）
    const { data: stateData } = await supabase
      .from('oauth_states')
      .select('state, tenant_id')
      .eq('state', state as string)
      .single();

    if (!stateData || stateData.state !== state || stateData.tenant_id !== userId) {
      return res.redirect('/settings?error=invalid_state');
    }

    // 有効期限切れのstateを削除
    await supabase
      .from('oauth_states')
      .delete()
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // 10分以上前のものを削除

    // OAuth2クライアントの設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
    );

    // 認証コードを使用してトークンを取得
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // 成功した場合、トークン情報をデータベースに保存
    if (tokens.access_token && tokens.refresh_token) {
      // トークン情報を保存
      const { data: existingToken } = await supabase
        .from('google_auth_tokens')
        .select('id')
        .eq('tenant_id', userId)
        .single();

      if (existingToken) {
        // 既存のトークンを更新
        await supabase
          .from('google_auth_tokens')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id);
      } else {
        // 新しいトークンを作成
        await supabase
          .from('google_auth_tokens')
          .insert({
            tenant_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // 認証成功ページにリダイレクト
      return res.redirect('/settings?google_auth=success');
    } else {
      // トークン取得エラー
      return res.redirect('/settings?error=token_error');
    }
  } catch (error: any) {
    console.error('Google認証エラー:', error);
    return res.redirect(`/settings?error=${encodeURIComponent(error.message || 'unknown_error')}`);
  }
} 