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
    console.log('[ForceAuth] Google認証テスト開始');
    
    // クエリパラメータから邮箱を取得（指定されていない場合はデフォルト）
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    
    // 認証クライアントを初期化
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Google認証情報が設定されていません',
        message: 'GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを.env.localファイルに設定してください'
      });
    }
    
    console.log('[ForceAuth] 認証情報:', {
      clientId: clientId.substring(0, 6) + '...' + clientId.substring(clientId.length - 4),
      clientSecret: clientSecret.substring(0, 3) + '...',
      redirectUrl
    });
    
    // OAuthクライアントの作成
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUrl
    );
    
    // 認証URLを生成（直接）
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/plus.business.manage'
      ],
      prompt: 'consent',
      include_granted_scopes: true,
      // ユーザーのメールアドレスが指定されている場合、それをヒントとして使用
      login_hint: email || undefined
    });
    
    console.log('[ForceAuth] 認証URL生成成功:', authUrl.substring(0, 50) + '...');
    
    // 認証URLにリダイレクト
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (error: any) {
    console.error('[ForceAuth] エラー:', error);
    
    // エラー情報をHTMLで表示
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google認証エラー</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #d32f2f; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Google認証エラー</h1>
        
        <p>認証URLの生成中にエラーが発生しました。</p>
        
        <h2>エラー詳細</h2>
        <pre>${JSON.stringify({
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: error.code
        }, null, 2)}</pre>
        
        <h2>推奨アクション</h2>
        <ol>
          <li>Google Cloud Consoleでクライアント認証情報が正しく設定されていることを確認してください</li>
          <li>.env.localファイルに正しいGOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETが設定されていることを確認してください</li>
          <li>APIとサービス &gt; OAuthの同意画面 でアプリが正しく設定されていることを確認してください</li>
        </ol>
        
        <div style="margin-top: 20px;">
          <a href="/settings">設定画面に戻る</a>
        </div>
      </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(html);
  }
} 