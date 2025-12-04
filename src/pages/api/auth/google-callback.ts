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
    // 認証コードを取得
    const { code, error: authError, mock } = req.query;
    
    if (authError) {
      console.error('Google認証エラー:', authError);
      return res.redirect('/settings?error=auth_failed');
    }
    
    if (!code) {
      return res.redirect('/settings?error=no_code');
    }
    
    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.redirect('/auth/login');
    }

    // 開発環境の場合はセッションをバイパス
    console.log('[GoogleCallback] 開発環境のため認証を バイパスします');
    
    // 開発環境用ユーザーID
    const developmentUserId = process.env.DEV_USER_ID || 'ce223858-240b-4888-9087-fddf947dd020';
    
    // モック認証が有効な場合
    if (mock === 'true' || process.env.MOCK_GOOGLE_AUTH === 'true') {
      console.log('[GoogleCallback] モック認証モードを使用します');
      
      const mockUserId = process.env.MOCK_USER_ID || developmentUserId;
      console.log('[GoogleCallback] モックユーザーID:', mockUserId);
      
      // 認証成功ページにリダイレクト（モック）
      res.writeHead(302, { Location: '/settings?google_auth=success&mock=true' });
      res.end();
      return;
    }
    
    console.log('[GoogleCallback] 開発環境での実際の認証フロー');
    
    // 認証コードからトークンを取得
    try {
      // OAuth2クライアントの設定
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
      );
      
      console.log('[GoogleCallback] OAuth2クライアント初期化完了', {
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      });
      
      // 認証コードを使用してトークンを取得
      const { tokens } = await oauth2Client.getToken(code as string);
      console.log('[GoogleCallback] トークン取得成功:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        expiryDate: tokens.expiry_date
      });
      
      // トークン情報を保存
      console.log('[GoogleCallback] 開発環境でのデータベース保存を開始:', {
        userId: developmentUserId,
        hasAccessToken: Boolean(tokens.access_token),
        hasRefreshToken: Boolean(tokens.refresh_token)
      });
      
      try {
        // 既存のトークンを確認
        console.log('[GoogleCallback] 既存トークンを確認:', { userId: developmentUserId });
        const { data: existingToken, error: queryError } = await supabase
          .from('google_auth_tokens')
          .select('id')
          .eq('tenant_id', developmentUserId)
          .single();
        
        console.log('[GoogleCallback] 既存トークン確認結果:', { 
          exists: Boolean(existingToken), 
          error: queryError ? `${(queryError as any).code}: ${queryError.message}` : null
        });
        
        if (queryError && (queryError as any).code !== 'PGRST116') {
          // PGRST116: no rows returned (単に結果がない場合)
          throw new Error(`既存トークン確認エラー: ${queryError.message}`);
        }

        if (existingToken) {
          // 既存のトークンを更新
          console.log('[GoogleCallback] 既存トークンを更新します:', { id: existingToken.id });
          const updateResult: any = await (supabase as any)
            .from('google_auth_tokens')
            .update({
              access_token: tokens.access_token || '',
              refresh_token: tokens.refresh_token || 'dummy-refresh-token',
              expiry_date: tokens.expiry_date 
                ? new Date(tokens.expiry_date).toISOString() 
                : new Date(Date.now() + 3600000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingToken.id)
            .select();
          const { data, error } = updateResult;
          
          console.log('[GoogleCallback] トークン更新結果:', { 
            success: !error, 
            error: error ? `${error.code}: ${error.message}` : null,
            data
          });
          
          if (error) {
            throw new Error(`トークン更新エラー: ${error.message}`);
          }
          
          console.log('[GoogleCallback] 既存トークン更新成功');
        } else {
          // 新しいトークンを作成
          console.log('[GoogleCallback] 新規トークンを作成します:', { userId: developmentUserId });
          const { data, error } = await supabase
            .from('google_auth_tokens')
            .insert({
              tenant_id: developmentUserId,
              access_token: tokens.access_token || '',
              refresh_token: tokens.refresh_token || 'dummy-refresh-token',
              expiry_date: tokens.expiry_date 
                ? new Date(tokens.expiry_date).toISOString() 
                : new Date(Date.now() + 3600000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();
          
          console.log('[GoogleCallback] トークン作成結果:', { 
            success: !error, 
            error: error ? `${error.code}: ${error.message}` : null,
            data
          });
          
          if (error) {
            throw new Error(`新規トークン作成エラー: ${error.message}`);
          }
          
          console.log('[GoogleCallback] 新規トークン作成成功');
        }
      } catch (error) {
        console.error('トークン保存エラー:', error);
        return res.redirect('/settings?error=db_failed');
      }
      
      // 成功
      return res.redirect('/settings?success=true');
    } catch (error) {
      console.error('Google認証コールバックエラー:', error);
      return res.redirect('/settings?error=server_error');
    }
  } catch (error) {
    console.error('Google認証コールバックエラー:', error);
    return res.redirect('/settings?error=server_error');
  }
} 