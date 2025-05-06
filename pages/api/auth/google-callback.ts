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
    
    // 通常の認証フロー
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[GoogleCallback] セッション情報:', session ? '取得成功' : '取得失敗', session?.user?.id);

    // データベース接続を確認
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('google_auth_tokens')
        .select('*', { count: 'exact', head: true });
      
      console.log('[GoogleCallback] DBテーブル確認:', {
        accessible: !tableError,
        error: tableError ? tableError.message : null,
        count: tableCheck ? tableCheck.length : 0
      });
    } catch (dbCheckError) {
      console.error('[GoogleCallback] DB接続確認エラー:', dbCheckError);
    }

    // 開発環境では認証を強制的にバイパス
    if (!session && isDevEnv) {
      console.log('[GoogleCallback] 開発環境のため認証をバイパスします');
      // 固定のユーザーIDを使用（開発環境用）
      const developmentUserId = 'ce223858-240b-4888-9087-fddf947dd020';
      
      // 認証コードを使用してトークンを取得
      try {
        const { code, state } = req.query;
        console.log('[GoogleCallback] 認証コード:', code ? '取得成功' : '取得失敗');
        
        // OAuth2クライアントの設定
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
        );

        // 認証コードを使用してトークンを取得
        const { tokens } = await oauth2Client.getToken(code as string);
        console.log('[GoogleCallback] トークン取得成功:', tokens ? '成功' : '失敗');
        
        if (tokens.access_token) {
          // トークン情報を保存
          try {
            // 有効期限がなければ現在時刻から1時間後を設定
            const expiryMillis = tokens.expiry_date || Date.now() + 3600000;
            // 必ず数値型のミリ秒タイムスタンプからDateオブジェクトを経由してISOフォーマットの文字列に変換する
            const expiryDate = new Date(Number(expiryMillis)).toISOString();
            // リフレッシュトークンがなければデフォルト値を設定
            const refreshToken = tokens.refresh_token || 'dummy-refresh-token';
            
            console.log('[GoogleCallback] 保存するトークン情報:', {
              userId: developmentUserId,
              accessTokenPrefix: tokens.access_token ? tokens.access_token.substring(0, 10) + '...' : null,
              hasRefreshToken: Boolean(refreshToken),
              expiryDateRaw: expiryMillis,
              expiryDateIso: expiryDate
            });
            
            const { data: existingToken, error: findError } = await supabase
              .from('google_auth_tokens')
              .select('id')
              .eq('tenant_id', developmentUserId)
              .single();
            
            console.log('[GoogleCallback] 既存トークン検索結果:', {
              found: Boolean(existingToken),
              error: findError ? {
                code: findError.code,
                message: findError.message,
                details: findError.details
              } : null
            });

            if (existingToken) {
              // 既存のトークンを更新
              const { data: updateData, error: updateError } = await supabase
                .from('google_auth_tokens')
                .update({
                  access_token: tokens.access_token,
                  refresh_token: refreshToken,
                  expiry_date: expiryDate,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingToken.id)
                .select();
                
                console.log('[GoogleCallback] 既存トークン更新結果:', {
                  success: !updateError,
                  data: updateData ? {
                    id: updateData[0]?.id,
                    tenant_id: updateData[0]?.tenant_id,
                    accessTokenPrefix: updateData[0]?.access_token ? updateData[0].access_token.substring(0, 10) + '...' : null,
                    updatedAt: updateData[0]?.updated_at,
                    expiryDate: updateData[0]?.expiry_date
                  } : null,
                  error: updateError ? {
                    code: updateError.code,
                    message: updateError.message,
                    details: updateError.details
                  } : null
                });
            } else {
              // 新しいトークンを作成
              const { data: insertData, error: insertError } = await supabase
                .from('google_auth_tokens')
                .insert({
                  tenant_id: developmentUserId,
                  access_token: tokens.access_token,
                  refresh_token: refreshToken,
                  expiry_date: expiryDate,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select();
                
                console.log('[GoogleCallback] 新規トークン作成結果:', {
                  success: !insertError,
                  data: insertData ? {
                    id: insertData[0]?.id,
                    tenant_id: insertData[0]?.tenant_id,
                    accessTokenPrefix: insertData[0]?.access_token ? insertData[0].access_token.substring(0, 10) + '...' : null,
                    createdAt: insertData[0]?.created_at,
                    expiryDate: insertData[0]?.expiry_date
                  } : null,
                  error: insertError ? {
                    code: insertError.code,
                    message: insertError.message,
                    details: insertError.details
                  } : null
                });
            }
            
            // 直接SQLクエリを実行してテーブル内の全レコードを確認
            console.log('[GoogleCallback] テーブル内のレコードを確認します...');
            const { data: allRecords, error: recordsError } = await supabase
              .from('google_auth_tokens')
              .select('id, tenant_id, created_at')
              .order('created_at', { ascending: false })
              .limit(5);
              
            console.log('[GoogleCallback] テーブル内レコード:', {
              count: allRecords?.length || 0,
              records: allRecords?.map(record => ({
                id: record.id,
                tenant_id: record.tenant_id,
                createdAt: record.created_at
              })) || [],
              error: recordsError ? {
                code: recordsError.code,
                message: recordsError.message
              } : null
            });
            
            // トークンが正しく保存されたか再確認
            const { data: verifyToken, error: verifyError } = await supabase
              .from('google_auth_tokens')
              .select('id, access_token, tenant_id, updated_at')
              .eq('tenant_id', developmentUserId)
              .single();
            
            console.log('[GoogleCallback] トークン保存検証:', {
              verified: Boolean(verifyToken),
              error: verifyError ? {
                code: verifyError.code,
                message: verifyError.message,
                details: verifyError.details
              } : null,
              tenant_id: verifyToken?.tenant_id,
              accessTokenPrefix: verifyToken ? verifyToken.access_token.substring(0, 10) + '...' : null,
              updatedAt: verifyToken ? verifyToken.updated_at : null
            });
            
            // 指定したtenantIdでデータが見つからない場合は、テーブル内の最新のトークンを確認
            if (verifyError && verifyError.code === 'PGRST116') {
              console.log('[GoogleCallback] 指定したユーザーIDでトークンが見つかりませんでした。最新トークンを確認します...');
              const { data: latestToken, error: latestError } = await supabase
                .from('google_auth_tokens')
                .select('id, tenant_id, created_at, updated_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
              console.log('[GoogleCallback] 最新トークン情報:', {
                found: Boolean(latestToken),
                data: latestToken ? {
                  id: latestToken.id,
                  tenant_id: latestToken.tenant_id,
                  createdAt: latestToken.created_at,
                  updatedAt: latestToken.updated_at
                } : null,
                error: latestError ? latestError.message : null
              });
            }
            
            // 認証成功ページにリダイレクト
            res.writeHead(302, { Location: '/settings?google_auth=success&dev=true' });
            res.end();
            return;
          } catch (dbError: any) {
            console.error('[GoogleCallback] データベース操作エラー:', dbError);
            // エラー詳細をクエリパラメータに追加
            res.writeHead(302, { Location: `/settings?error=db_error&details=${encodeURIComponent(dbError.message)}` });
            res.end();
            return;
          }
        } else {
          // トークン取得エラー
          res.writeHead(302, { Location: '/settings?error=token_error&dev=true' });
          res.end();
          return;
        }
      } catch (tokenError: any) {
        console.error('[GoogleCallback] トークン取得エラー:', tokenError);
        // エラー詳細をクエリパラメータに追加
        res.writeHead(302, { Location: `/settings?error=token_error&details=${encodeURIComponent(tokenError.message)}` });
        res.end();
        return;
      }
    }

    if (!session) {
      console.log('[GoogleCallback] 未認証のためログインページへリダイレクト');
      res.writeHead(302, { Location: '/auth/login?error=auth_required&source=callback' });
      res.end();
      return;
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
      res.writeHead(302, { Location: '/settings?error=invalid_state' });
      res.end();
      return;
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
      // 有効期限がなければ現在時刻から1時間後を設定
      const expiryMillis = tokens.expiry_date || Date.now() + 3600000;
      // 必ず数値型のミリ秒タイムスタンプからDateオブジェクトを経由してISOフォーマットの文字列に変換する
      const expiryDate = new Date(Number(expiryMillis)).toISOString();
    
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
            expiry_date: expiryDate,
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
            expiry_date: expiryDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // 認証成功ページにリダイレクト
      res.writeHead(302, { Location: '/settings?google_auth=success' });
      res.end();
      return;
    } else {
      // トークン取得エラー
      res.writeHead(302, { Location: '/settings?error=token_error' });
      res.end();
      return;
    }
  } catch (error: any) {
    console.error('Google認証エラー:', error);
    res.writeHead(302, { Location: `/settings?error=${encodeURIComponent(error.message || 'unknown_error')}` });
    res.end();
    return;
  }
} 