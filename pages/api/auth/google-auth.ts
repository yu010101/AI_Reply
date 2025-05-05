import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '@/utils/supabase';
import crypto from 'crypto';

// OAuth2クライアントの作成
const createOAuth2Client = (): OAuth2Client => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
  );
};

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

    // CSRFトークンとして使用するランダムなstate値を生成
    const state = crypto.randomBytes(16).toString('hex');

    // stateをデータベースに保存
    await supabase
      .from('oauth_states')
      .insert({
        tenant_id: userId,
        state,
        created_at: new Date().toISOString()
      });

    // OAuth2クライアントを作成
    const oauth2Client = createOAuth2Client();

    // 認証URLを生成
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/plus.business.manage'
      ],
      state,
      prompt: 'consent', // 常に同意画面を表示してリフレッシュトークンを確実に取得
    });

    // 認証URLをレスポンスとして返す
    return res.status(200).json({ url: authUrl });
  } catch (error: any) {
    console.error('認証URL生成エラー:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 