import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { google } from 'googleapis';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

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
  
  logger.debug('GoogleCallback: 実行環境', { isDevEnv, useMockAuth });
  logger.debug('GoogleCallback: クエリパラメータ', { query: req.query });

  try {
    // モック認証は無効化するので、この部分はスキップされる
    if (isDevEnv && useMockAuth && req.query.mock === 'true') {
      logger.info('GoogleCallback: モック認証モードを使用します');
      
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      let userId;
      
      if (session) {
        userId = session.user.id;
        logger.debug('GoogleCallback: セッションからユーザーID取得', { userId });
      } else {
        // クエリパラメータからユーザーIDを取得
        userId = req.query.userId || req.query.state?.toString().split('-')[0] || 'mock-user-id';
        logger.debug('GoogleCallback: モック認証用ユーザーID', { userId });
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
        
        logger.debug('GoogleCallback: 既存トークン確認', { hasToken: !!existingToken, error: tokenError });
        
        // テーブルが存在しない場合はローカルストレージにモックデータを保存する
        if (tokenError && (tokenError as any).code === '42P01') {
          logger.warn('GoogleCallback: テーブルが存在しないため、ローカルストレージを使用します');
          
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
          const updateResult = await supabase
            .from('google_auth_tokens')
            .update({
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expiry_date: expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingToken.id);
          
          logger.debug('GoogleCallback: トークン更新結果', { success: !!updateResult });
        } else {
          // 新しいトークンを作成
          const insertResult = await supabase
            .from('google_auth_tokens')
            .insert({
              tenant_id: realUserId,
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expiry_date: expiryDate.toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          logger.debug('GoogleCallback: 新規トークン作成結果', { success: !!insertResult });
        }
        
        logger.info('GoogleCallback: モックデータを保存しました');
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
    logger.debug('GoogleCallback: セッション情報', { hasSession: !!session, userId: session?.user?.id });

    // データベース接続を確認
    try {
      const tableCheckResult: any = await supabase
        .from('google_auth_tokens')
        .select('id');
      
      logger.debug('GoogleCallback: DBテーブル確認', {
        accessible: !tableCheckResult.error,
        error: tableCheckResult.error ? tableCheckResult.error.message : null,
        count: tableCheckResult.data ? tableCheckResult.data.length : 0
      });
    } catch (dbCheckError) {
      logger.error('GoogleCallback: DB接続確認エラー', { error: dbCheckError });
    }

    // 開発環境では認証を強制的にバイパス
    if (!session && isDevEnv) {
      logger.info('GoogleCallback: 開発環境のため認証をバイパスします');
      // 固定のユーザーIDを使用（開発環境用）
      const developmentUserId = 'ce223858-240b-4888-9087-fddf947dd020';
      
      // 認証コードを使用してトークンを取得
      try {
        const { code, state } = req.query;
        logger.debug('GoogleCallback: 認証コード', { hasCode: !!code });
        
        // OAuth2クライアントの設定
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
        );

        // 認証コードを使用してトークンを取得
        const { tokens } = await oauth2Client.getToken(code as string);
        logger.debug('GoogleCallback: トークン取得', { success: !!tokens });
        
        if (tokens.access_token) {
          // トークン情報を保存
          try {
            // 有効期限がなければ現在時刻から1時間後を設定
            const expiryMillis = tokens.expiry_date || Date.now() + 3600000;
            // 必ず数値型のミリ秒タイムスタンプからDateオブジェクトを経由してISOフォーマットの文字列に変換する
            const expiryDate = new Date(Number(expiryMillis)).toISOString();
            // リフレッシュトークンがなければデフォルト値を設定
            const refreshToken = tokens.refresh_token || 'dummy-refresh-token';
            
            logger.debug('GoogleCallback: 保存するトークン情報', {
              userId: developmentUserId,
              hasAccessToken: !!tokens.access_token,
              hasRefreshToken: Boolean(refreshToken),
            });
            
            const { data: existingToken, error: findError } = await supabase
              .from('google_auth_tokens')
              .select('id')
              .eq('tenant_id', developmentUserId)
              .single();
            
            logger.debug('GoogleCallback: 既存トークン検索結果', {
              found: Boolean(existingToken),
              error: findError ? {
                code: (findError as any).code,
                message: findError.message,
                details: (findError as any).details
              } : null
            });

            if (existingToken) {
              // 既存のトークンを更新
              const updateResult: any = await (supabase
                .from('google_auth_tokens')
                .update({
                  access_token: tokens.access_token,
                  refresh_token: refreshToken,
                  expiry_date: expiryDate,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingToken.id) as any)
                .select();
              
              const updateData = updateResult?.data;
              const updateError = updateResult?.error;
                
                logger.debug('GoogleCallback: 既存トークン更新結果', {
                  success: !updateError,
                  hasData: !!updateData,
                  error: updateError ? {
                    code: (updateError as any).code,
                    message: updateError.message,
                    details: (updateError as any).details
                  } : null
                });
            } else {
              // 新しいトークンを作成
              const insertResult: any = await (supabase
                .from('google_auth_tokens')
                .insert({
                  tenant_id: developmentUserId,
                  access_token: tokens.access_token,
                  refresh_token: refreshToken,
                  expiry_date: expiryDate,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }) as any)
                .select();
              
              const insertData = insertResult?.data;
              const insertError = insertResult?.error;
                
                logger.debug('GoogleCallback: 新規トークン作成結果', {
                  success: !insertError,
                  hasData: !!insertData,
                  error: insertError ? {
                    code: (insertError as any).code,
                    message: insertError.message,
                    details: (insertError as any).details
                  } : null
                });
            }
            
            // 直接SQLクエリを実行してテーブル内の全レコードを確認
            logger.debug('GoogleCallback: テーブル内のレコードを確認します');
            const recordsResult: any = await (supabase
              .from('google_auth_tokens')
              .select('id, tenant_id, created_at') as any)
              .order('created_at', { ascending: false })
              .limit(5);
            
            const allRecords = recordsResult?.data;
            const recordsError = recordsResult?.error;
              
            logger.debug('GoogleCallback: テーブル内レコード', {
              count: Array.isArray(allRecords) ? allRecords.length : 0,
              hasError: !!recordsError,
              error: recordsError ? {
                code: (recordsError as any).code,
                message: recordsError.message
              } : null
            });
            
            // トークンが正しく保存されたか再確認
            const { data: verifyToken, error: verifyError } = await supabase
              .from('google_auth_tokens')
              .select('id, access_token, tenant_id, updated_at')
              .eq('tenant_id', developmentUserId)
              .single();
            
            logger.debug('GoogleCallback: トークン保存検証', {
              verified: Boolean(verifyToken),
              hasError: !!verifyError,
              error: verifyError ? {
                code: (verifyError as any).code,
                message: verifyError.message,
                details: (verifyError as any).details
              } : null,
              tenant_id: verifyToken?.tenant_id
            });
            
            // 指定したtenantIdでデータが見つからない場合は、テーブル内の最新のトークンを確認
            if (verifyError && (verifyError as any).code === 'PGRST116') {
              logger.warn('GoogleCallback: 指定したユーザーIDでトークンが見つかりませんでした。最新トークンを確認します');
              const latestResult: any = await (supabase
                .from('google_auth_tokens')
                .select('id, tenant_id, created_at, updated_at') as any)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              
              const latestToken = latestResult?.data;
              const latestError = latestResult?.error;
                
              logger.debug('GoogleCallback: 最新トークン情報', {
                found: Boolean(latestToken),
                hasError: !!latestError,
                error: latestError ? latestError.message : null
              });
            }
            
            // 認証成功ページにリダイレクト
            res.writeHead(302, { Location: '/settings?google_auth=success&dev=true' });
            res.end();
            return;
          } catch (dbError: any) {
            logger.error('GoogleCallback: データベース操作エラー', { error: dbError });
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
        logger.error('GoogleCallback: トークン取得エラー', { error: tokenError });
        // エラー詳細をクエリパラメータに追加
        res.writeHead(302, { Location: `/settings?error=token_error&details=${encodeURIComponent(tokenError.message)}` });
        res.end();
        return;
      }
    }

    if (!session) {
      logger.warn('GoogleCallback: 未認証のためログインページへリダイレクト');
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
    logger.error('Google認証エラー', { error });
    res.writeHead(302, { Location: `/settings?error=${encodeURIComponent(error.message || 'unknown_error')}` });
    res.end();
    return;
  }
} 