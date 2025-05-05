import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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
    console.log('ユーザー登録試行:', { email });

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'メールアドレスとパスワードは必須です',
        error: 'Missing credentials'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error('登録エラー:', error);
      return res.status(400).json({ 
        message: 'ユーザー登録に失敗しました',
        error: error.message,
        details: error
      });
    }

    console.log('ユーザー登録成功:', { email, userId: data.user?.id });
    return res.status(200).json({
      message: '登録メールを送信しました。メールを確認してください。',
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