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
    // 環境変数の検証
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret) {
      console.error('[google-auth] Google OAuth credentials not configured');
      return res.status(500).json({
        error: 'Google OAuth認証情報が設定されていません',
        details: 'GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定してください'
      });
    }

    if (!appUrl) {
      console.error('[google-auth] NEXT_PUBLIC_APP_URL not configured');
      return res.status(500).json({
        error: 'アプリケーションURLが設定されていません',
        details: 'NEXT_PUBLIC_APP_URL を設定してください'
      });
    }

    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // OAuth2クライアントの設定
    const redirectUri = `${appUrl}/api/auth/google-callback`;
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Google Business Profile API用のスコープ
    const scopes = [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // 認証URLを生成
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // リフレッシュトークンを確実に取得
      state: session.user.id, // ユーザーIDをstateとして渡す
    });

    return res.status(200).json({ url: authUrl });

  } catch (error: any) {
    console.error('[google-auth] エラー:', error);
    res.status(500).json({
      error: '認証準備中にエラーが発生しました',
      details: error.message
    });
  }
}
