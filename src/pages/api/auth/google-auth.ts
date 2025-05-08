import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('==========================================');
  console.log('[google-auth] API呼び出し開始');
  
  // リクエストメソッドとパスをログ出力
  console.log('[google-auth] リクエスト受信:', { 
    method: req.method, 
    path: req.url,
    timestamp: new Date().toISOString()
  });
  
  if (req.method !== 'GET') {
    console.log('[google-auth] 不正なメソッド:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 強制的に開発環境として処理
    const isDevEnv = true; // process.env.NODE_ENV === 'development';
    console.log('[google-auth] 実行環境詳細:', { 
      isDevEnv, 
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'なし',
      forceDevMode: true
    });
    
    // クッキーの詳細をログ出力
    const cookieStr = req.headers.cookie || '';
    console.log('[google-auth] クッキー詳細:', {
      cookieExists: !!cookieStr,
      cookieLength: cookieStr.length,
      cookieStart: cookieStr.substring(0, 50) + (cookieStr.length > 50 ? '...' : ''),
      hasAuthCookie: cookieStr.includes('supabase-auth'),
      cookieParts: cookieStr.split(';').map(c => c.trim().substring(0, 20) + '...').slice(0, 3)
    });
    
    console.log('[google-auth] 強制的にモックモードを使用します');
    
    // モックコールバックURLを生成して返す
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const mockCallbackUrl = `${appUrl}/api/auth/google-callback?code=mock_auth_code&mock=true&ts=${Date.now()}`;
    console.log('[google-auth] モック認証URL生成:', mockCallbackUrl);
    
    // 応答を返す前に最終ログ
    console.log('[google-auth] 正常終了 - 200 応答');
    console.log('==========================================');
    
    return res.status(200).json({ url: mockCallbackUrl });
    
  } catch (error) {
    console.error('[google-auth] エラー発生:', error);
    console.log('==========================================');
    res.status(500).json({ error: '認証準備中にエラーが発生しました', details: error instanceof Error ? error.message : '不明なエラー' });
  }
} 