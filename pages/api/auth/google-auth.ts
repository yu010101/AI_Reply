import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '@/utils/supabase';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

// OAuth2クライアントの作成
const createOAuth2Client = (): OAuth2Client => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`;
  
  // 詳細な診断ログを追加
  logger.debug('OAuth診断: クライアント設定詳細', {
    clientIdLength: clientId?.length || 0,
    clientIdFormat: clientId?.includes('.apps.googleusercontent.com') ? '正しい形式' : '不正な形式',
    redirectUrl,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    env: process.env.NODE_ENV,
    envVarsLoaded: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    mockAuth: process.env.MOCK_GOOGLE_AUTH === 'true'
  });
  
  logger.debug('OAuth: クライアント設定', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    redirectUrl,
    env: process.env.NODE_ENV
  });
  
  return new OAuth2Client(
    clientId,
    clientSecret,
    redirectUrl
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
    // 開発環境かどうかを確認
    const isDevEnv = process.env.NODE_ENV === 'development';
    // 常にモックモードを無効化
    const useMockAuth = false;
    
    // すべての環境変数をチェック（セキュリティ上重要な部分は伏せる）
    logger.debug('API検証: 環境変数チェック', {
      NODE_ENV: process.env.NODE_ENV,
      MOCK_GOOGLE_AUTH: 'false (強制的に無効化)',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID 
        ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 6)}...${process.env.GOOGLE_CLIENT_ID.substring(process.env.GOOGLE_CLIENT_ID.length - 4)}` 
        : '未設定',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET 
        ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 3)}...` 
        : '未設定',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      ENV_FILE_CHECK: {
        // 環境変数が読み込まれたファイルを確認
        hasEnvLocal: process.env.HAS_ENV_LOCAL === 'true',
        hasEnvDev: process.env.HAS_ENV_DEVELOPMENT === 'true',
        hasEnvProd: process.env.HAS_ENV_PRODUCTION === 'true',
      }
    });
    
    // 環境変数の競合をチェック
    const processEnvStr = JSON.stringify(process.env);
    logger.debug('API検証: プロセス環境', { envLength: processEnvStr.length });
    
    logger.debug('API: 実行環境', { isDevEnv, useMockAuth });

    let userId;

    // 開発環境の場合、セッションチェックをスキップ
    if (isDevEnv) {
      logger.info('API: 開発環境のためセッションチェックをスキップします');
      // リクエストからユーザーIDを取得（クエリパラメータまたはヘッダー）
      userId = req.query.userId || req.headers['x-user-id'] || 'dev-user-id';
      logger.debug('API: 開発環境用ユーザーID', { userId });
    } else {
      // 本番環境では通常通りセッションチェック
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return res.status(401).json({ error: '認証されていません' });
      }

      userId = session.user.id;
    }

    // CSRFトークンとして使用するランダムなstate値を生成
    const state = crypto.randomBytes(16).toString('hex');

    // 開発環境ではデータベース操作をスキップするオプション
    if (!isDevEnv) {
      // stateをデータベースに保存
      await supabase
        .from('oauth_states')
        .insert({
          tenant_id: userId,
          state,
          created_at: new Date().toISOString()
        });
    }

    // モック認証が有効な場合
    if (isDevEnv && useMockAuth) {
      logger.info('OAuth: モック認証モードを使用します');
      
      // モック認証のコールバックURLを生成
      // このURLにリダイレクトすると、google-callbackエンドポイントがモックデータで応答するように実装する
      const mockAuthUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback?state=${state}&code=mock_auth_code&mock=true`;
      
      logger.debug('OAuth: 生成されたモック認証URL', { url: mockAuthUrl });
      
      return res.status(200).json({ url: mockAuthUrl });
    }
    
    try {
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
        // テスト用
        include_granted_scopes: true,
        login_hint: typeof req.query.email === 'string' ? req.query.email : undefined
      });
      
      logger.debug('OAuth: 生成された認証URL', { urlLength: authUrl.length });
      logger.debug('OAuth: クライアント情報', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`,
        scopes: [
          'https://www.googleapis.com/auth/business.manage',
          'https://www.googleapis.com/auth/plus.business.manage'
        ]
      });

      // 認証URLをレスポンスとして返す
      return res.status(200).json({ url: authUrl });
    } catch (oauthError: any) {
      // OAuth特有のエラーをキャプチャ
      logger.error('OAuth診断: OAuth初期化エラー詳細', {
        name: oauthError.name,
        message: oauthError.message,
        stack: oauthError.stack?.split('\n').slice(0, 3).join('\n'),
        code: oauthError.code,
        status: oauthError.status,
      });
      
      return res.status(500).json({ 
        error: 'OAuth設定エラー', 
        details: `クライアントID・シークレットが不正、または設定に問題があります (${oauthError.message})` 
      });
    }
  } catch (error: any) {
    logger.error('認証URL生成エラー', { error });
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 