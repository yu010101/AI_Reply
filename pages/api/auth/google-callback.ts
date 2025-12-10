import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { google } from 'googleapis';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      logger.warn('GoogleCallback: 未認証のためログインページへリダイレクト');
      res.writeHead(302, { Location: '/auth/login?error=auth_required&source=callback' });
      res.end();
      return;
    }

    const userId = session.user.id;
    const { code, state } = req.query;

    if (!code) {
      res.writeHead(302, { Location: '/settings?error=no_code' });
      res.end();
      return;
    }

    // stateパラメータを確認（CSRF保護）
    const { data: stateData } = await supabase
      .from('oauth_states')
      .select('state, tenant_id')
      .eq('state', state as string)
      .single();

    if (!stateData || stateData.state !== state || stateData.tenant_id !== userId) {
      res.writeHead(302, { Location: '/settings?error=invalid_state' });
      res.end();
      return;
    }

    // 有効期限切れのstateを削除
    await supabase
      .from('oauth_states')
      .delete()
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // OAuth2クライアントの設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
    );

    // 認証コードを使用してトークンを取得
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token) {
      res.writeHead(302, { Location: '/settings?error=token_error' });
      res.end();
      return;
    }

    // 有効期限がなければ現在時刻から1時間後を設定
    const expiryMillis = tokens.expiry_date || Date.now() + 3600000;
    const expiryDate = new Date(Number(expiryMillis)).toISOString();

    // トークン情報を保存
    const { data: existingToken } = await supabase
      .from('google_auth_tokens')
      .select('id')
      .eq('tenant_id', userId)
      .single();

    if (existingToken) {
      // 既存のトークンを更新
      const updateData: any = {
        access_token: tokens.access_token,
        expiry_date: expiryDate,
        updated_at: new Date().toISOString()
      };

      // リフレッシュトークンがある場合のみ更新
      if (tokens.refresh_token) {
        updateData.refresh_token = tokens.refresh_token;
      }

      await supabase
        .from('google_auth_tokens')
        .update(updateData)
        .eq('id', existingToken.id);
    } else {
      // 新しいトークンを作成（リフレッシュトークンが必須）
      if (!tokens.refresh_token) {
        res.writeHead(302, { Location: '/settings?error=refresh_token_required' });
        res.end();
        return;
      }

      await supabase
        .from('google_auth_tokens')
        .insert({
          tenant_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: expiryDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // 認証成功ページにリダイレクト
    res.writeHead(302, { Location: '/settings?google_auth=success' });
    res.end();
    return;
  } catch (error: any) {
    logger.error('Google認証エラー', { error });
    res.writeHead(302, { Location: `/settings?error=${encodeURIComponent(error.message || 'unknown_error')}` });
    res.end();
    return;
  }
}
