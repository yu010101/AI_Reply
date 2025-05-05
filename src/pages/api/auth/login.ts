import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// 環境変数の確認
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Supabase環境変数が設定されていません');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    console.log('ログイン試行:', { email });

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'メールアドレスとパスワードは必須です',
        error: 'Missing credentials'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('ログインエラー:', error);
      return res.status(401).json({ 
        message: '認証に失敗しました',
        error: error.message,
        details: error
      });
    }

    if (!data.session) {
      return res.status(401).json({ 
        message: 'セッションが作成できませんでした',
        error: 'No session created'
      });
    }

    console.log('ログイン成功:', { email, userId: data.user?.id });
    return res.status(200).json({
      token: data.session.access_token,
      user: data.user,
    });
  } catch (error) {
    console.error('予期せぬエラー:', error);
    return res.status(500).json({ 
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 