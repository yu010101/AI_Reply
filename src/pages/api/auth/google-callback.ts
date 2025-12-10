import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { OAuth2Client } from 'google-auth-library';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証コードとstateを取得
    const { code, error: authError, state } = req.query;

    if (authError) {
      console.error('Google認証エラー:', authError);
      return res.redirect('/settings?error=auth_failed');
    }

    if (!code) {
      return res.redirect('/settings?error=no_code');
    }

    // 環境変数の検証
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      console.error('[google-callback] OAuth credentials not configured');
      return res.redirect('/settings?error=config_error');
    }

    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();

    // セッションがない場合、stateからユーザーIDを取得
    const userId = session?.user?.id || (state as string);

    if (!userId) {
      console.error('[google-callback] ユーザーIDが取得できません');
      return res.redirect('/auth/login?error=session_required');
    }

    // OAuth2クライアントの設定
    const redirectUri = `${appUrl}/api/auth/google-callback`;
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // 認証コードを使用してトークンを取得
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token) {
      console.error('[google-callback] アクセストークンの取得に失敗');
      return res.redirect('/settings?error=token_failed');
    }

    // リフレッシュトークンがない場合はエラー（初回認証時は必須）
    if (!tokens.refresh_token) {
      console.warn('[google-callback] リフレッシュトークンがありません。再認証が必要な場合があります。');
    }

    // トークン情報を保存
    const tokenData = {
      tenant_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // 既存のトークンを確認
    const { data: existingToken } = await supabase
      .from('google_auth_tokens')
      .select('id, refresh_token')
      .eq('tenant_id', userId)
      .single();

    if (existingToken) {
      // 既存のトークンを更新（リフレッシュトークンがない場合は既存のものを維持）
      const updateData = {
        access_token: tokenData.access_token,
        expiry_date: tokenData.expiry_date,
        updated_at: tokenData.updated_at,
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token })
      };

      const { error: updateError } = await supabase
        .from('google_auth_tokens')
        .update(updateData)
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('[google-callback] トークン更新エラー:', updateError);
        return res.redirect('/settings?error=db_failed');
      }
    } else {
      // 新しいトークンを作成
      if (!tokenData.refresh_token) {
        return res.redirect('/settings?error=refresh_token_required');
      }

      const { error: insertError } = await supabase
        .from('google_auth_tokens')
        .insert({
          tenant_id: tokenData.tenant_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expiry_date: tokenData.expiry_date,
          updated_at: tokenData.updated_at,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[google-callback] トークン作成エラー:', insertError);
        return res.redirect('/settings?error=db_failed');
      }
    }

    // 成功
    return res.redirect('/settings?google_auth=success');

  } catch (error: any) {
    console.error('Google認証コールバックエラー:', error);
    return res.redirect('/settings?error=server_error');
  }
}
