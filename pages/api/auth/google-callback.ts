/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { google } from 'googleapis';
import { supabase } from '@/utils/supabase';
// @ts-ignore – dynamic typings sometimes fail to resolve in Next.js server files
import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Buffer = (globalThis as any).Buffer;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 開発環境かどうかを確認
  const isDevEnv = process.env.NODE_ENV === 'development';
  // 常にモックモードを無効化
  const useMockAuth = false;
  
  console.log('[GoogleCallback] 実行環境:', { isDevEnv, useMockAuth });
  console.log('[GoogleCallback] クエリパラメータ:', req.query);

  try {
    // モック認証は無効化するので、この部分はスキップされる
    if (isDevEnv && useMockAuth && req.query.mock === 'true') {
      console.log('[GoogleCallback] モック認証モードを使用します');
      
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      let userId;
      
      if (session) {
        userId = session.user.id;
        console.log('[GoogleCallback] セッションからユーザーID取得:', userId);
      } else {
        // クエリパラメータからユーザーIDを取得
        userId = req.query.userId || req.query.state?.toString().split('-')[0] || 'mock-user-id';
        console.log('[GoogleCallback] モック認証用ユーザーID:', userId);
      }
      
      // 本物のユーザーIDを使う
      const realUserId = 'ce223858-240b-4888-9087-fddf947dd020'; // ログから確認したID
      
      try {
        // 現在時刻から1時間後をトークンの有効期限とする
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);
        
        // モックデータを使用して既存のレコードを確認
        const { data: existingToken, error: tokenError } = await supabase
          .from('google_auth_tokens')
          .select('id')
          .eq('tenant_id', realUserId)
          .single();
        
        console.log('[GoogleCallback] 既存トークン確認:', { existingToken, error: tokenError });
        
        // テーブルが存在しない場合はローカルストレージにモックデータを保存する
        if (tokenError && tokenError.code === '42P01') {
          console.log('[GoogleCallback] テーブルが存在しないため、ローカルストレージを使用します');
          
          // ブラウザでレンダリングする際にローカルストレージに保存するためのスクリプトを含める
          const redirectUrl = '/settings?google_auth=success&mock=true&storage=true';
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>認証リダイレクト</title>
                <script>
                  // モック認証情報をローカルストレージに保存
                  localStorage.setItem('mockGoogleAuthToken', JSON.stringify({
                    access_token: 'mock-access-token',
                    refresh_token: 'mock-refresh-token',
                    expiry_date: '${expiryDate.toISOString()}',
                    userId: '${realUserId}',
                    updated_at: '${new Date().toISOString()}'
                  }));
                  
                  // リダイレクト
                  window.location.href = '${redirectUrl}';
                </script>
              </head>
              <body>
                <p>認証成功しました。リダイレクトします...</p>
              </body>
            </html>
          `;
          
          res.setHeader('Content-Type', 'text/html');
          res.status(200).send(html);
          return;
        }

        if (existingToken) {
          // 既存のトークンを更新
          const { data, error } = await supabase
            .from('google_auth_tokens')
            .update({
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expiry_date: expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingToken.id);
          
          console.log('[GoogleCallback] トークン更新結果:', { data, error });
        } else {
          // 新しいトークンを作成
          const { data, error } = await supabase
            .from('google_auth_tokens')
            .insert({
              tenant_id: realUserId,
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expiry_date: expiryDate.toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          console.log('[GoogleCallback] 新規トークン作成結果:', { data, error });
        }
        
        console.log('[GoogleCallback] モックデータを保存しました');
      } catch (dbError) {
        console.error('[GoogleCallback] データベース操作エラー:', dbError);
      }
      
      // 認証成功ページにリダイレクト
      res.writeHead(302, { Location: '/settings?google_auth=success&mock=true' });
      res.end();
      return;
    }
    
    // -------------------------
    // ここから新しいロジック
    // -------------------------

    // state から userId を抽出（google-auth で `${userId}-${random}` という形式でエンコードしています）
    const { code, state: stateParam } = req.query;

    if (!stateParam || typeof stateParam !== 'string') {
      console.error('[GoogleCallback] state パラメータがありません');
      res.writeHead(302, { Location: '/settings?error=invalid_state' });
      res.end();
      return;
    }

    const [encodedUserId] = stateParam.split('.');
    let userId: string;
    try {
      const padded = encodedUserId.replace(/-/g, '+').replace(/_/g, '/');
      userId = Buffer.from(padded, 'base64').toString('utf-8');
    } catch (e) {
      console.error('[GoogleCallback] userId decode 失敗:', e);
      res.writeHead(302, { Location: '/settings?error=invalid_state' });
      res.end();
      return;
    }

    // Supabase Admin client（サービスロールキー）を使用してトークンを保存
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    console.log('[GoogleCallback] userId (from state):', userId);

    // 認証コードを使用してトークンを取得
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
    );

    let tokens;
    try {
      const resp = await oauth2Client.getToken(code as string);
      tokens = resp.tokens;
    } catch (tokenErr) {
      console.error('[GoogleCallback] トークン取得失敗:', tokenErr);
      res.writeHead(302, { Location: '/settings?error=token_error' });
      res.end();
      return;
    }

    // トークンを DB に upsert
    if (!tokens.access_token) {
      res.writeHead(302, { Location: '/settings?error=token_error' });
      res.end();
      return;
    }

    const expiryMillis = tokens.expiry_date || Date.now() + 3600000;
    const expiryDateIso = new Date(Number(expiryMillis)).toISOString();

    try {
      // 既存のレコードがあるか確認
      const { data: existing } = await supabaseAdmin
        .from('google_auth_tokens')
        .select('id')
        .eq('tenant_id', userId)
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from('google_auth_tokens')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expiry_date: expiryDateIso,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('google_auth_tokens')
          .insert({
            tenant_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expiry_date: expiryDateIso,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (e) {
      console.error('[GoogleCallback] トークン保存中の予期せぬエラー:', e);
    }

    // 完了したら設定ページへリダイレクト
    res.writeHead(302, { Location: '/settings?google_auth=success' });
    res.end();
    return;
  } catch (error: any) {
    console.error('Google認証エラー:', error);
    res.writeHead(302, { Location: `/settings?error=${encodeURIComponent(error.message || 'unknown_error')}` });
    res.end();
    return;
  }
} 