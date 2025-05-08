import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 開発環境でのみ実行可能
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'この操作は開発環境でのみ許可されています' });
  }

  try {
    console.log('[検証] Google認証設定チェック開始');
    
    // 環境変数の状態を確認
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`;
    const mockAuth = process.env.MOCK_GOOGLE_AUTH === 'true';
    
    // 環境変数の値（機密情報は一部マスク）
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MOCK_GOOGLE_AUTH: mockAuth,
      GOOGLE_CLIENT_ID: clientId ? 
        `${clientId.substring(0, 6)}...${clientId.substring(clientId.length - 4)}` : '未設定',
      GOOGLE_CLIENT_SECRET: clientSecret ? 
        `${clientSecret.substring(0, 3)}...` : '未設定',
      REDIRECT_URL: redirectUrl
    };
    
    console.log('[検証] 環境変数:', envInfo);
    
    // 結果オブジェクト
    const results = {
      environment: envInfo,
      checks: {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        hasRedirectUrl: Boolean(redirectUrl),
        mockAuthEnabled: mockAuth,
        clientIdFormat: clientId?.includes('.apps.googleusercontent.com') 
          ? '正しい形式' : '不正な形式',
        clientSecretFormat: clientSecret?.startsWith('GOCSPX-') 
          ? '正しい形式' : '不正な形式'
      },
      testResults: {} as any
    };
    
    // 認証クライアントのテスト
    if (clientId && clientSecret && redirectUrl) {
      try {
        const oauth2Client = new OAuth2Client(
          clientId,
          clientSecret,
          redirectUrl
        );
        
        // 認証URLの生成をテスト
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/business.manage'],
          state: 'test-state'
        });
        
        results.testResults.authUrlGeneration = '成功';
        results.testResults.authUrl = authUrl.substring(0, 50) + '...';
        
        console.log('[検証] 認証URL生成テスト成功');
      } catch (oauthError: any) {
        results.testResults.authUrlGeneration = '失敗';
        results.testResults.error = {
          message: oauthError.message,
          name: oauthError.name,
          code: oauthError.code
        };
        
        console.error('[検証] 認証URL生成テスト失敗:', oauthError);
      }
    } else {
      results.testResults.authUrlGeneration = 'スキップ (認証情報不足)';
      console.log('[検証] 認証情報が不足しているためテストをスキップします');
    }
    
    // 問題の原因と推奨アクション
    let diagnosis = '正常に設定されています';
    let recommendedAction = '';
    
    if (!results.checks.hasClientId || !results.checks.hasClientSecret) {
      diagnosis = 'Google認証情報が設定されていません';
      recommendedAction = 'GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを.env.localファイルに設定してください';
    } else if (results.checks.mockAuthEnabled) {
      diagnosis = 'モック認証が有効になっています';
      recommendedAction = '.env.localファイルでMOCK_GOOGLE_AUTH=falseに設定してください';
    } else if (results.checks.clientIdFormat === '不正な形式' || results.checks.clientSecretFormat === '不正な形式') {
      diagnosis = 'Google認証情報の形式が正しくありません';
      recommendedAction = 'Google Cloud Consoleで新しいOAuthクライアントを作成し、.env.localファイルを更新してください';
    } else if (results.testResults.authUrlGeneration === '失敗') {
      diagnosis = 'OAuth2Clientの初期化に失敗しました';
      recommendedAction = 'Google Cloud Consoleの設定を確認し、APIが有効になっていることを確認してください';
    }
    
    // 診断結果をレスポンスとして返す
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google認証設定の検証</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .success { color: green; }
          .error { color: red; }
          .warning { color: orange; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
          section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Google認証設定の検証結果</h1>
        
        <section>
          <h2>診断結果</h2>
          <p class="${diagnosis.includes('正常') ? 'success' : 'error'}">${diagnosis}</p>
          ${recommendedAction ? `<p><strong>推奨アクション:</strong> ${recommendedAction}</p>` : ''}
        </section>
        
        <section>
          <h2>環境情報</h2>
          <pre>${JSON.stringify(results.environment, null, 2)}</pre>
        </section>
        
        <section>
          <h2>検証結果</h2>
          <pre>${JSON.stringify(results.checks, null, 2)}</pre>
        </section>
        
        <section>
          <h2>認証テスト結果</h2>
          <pre>${JSON.stringify(results.testResults, null, 2)}</pre>
        </section>
        
        <div style="margin-top: 20px;">
          <a href="/settings">設定画面に戻る</a>
        </div>
      </body>
    </html>
    `;
    
    // HTMLレスポンスを返す
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error: any) {
    console.error('[検証] エラー:', error);
    return res.status(500).json({ 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 