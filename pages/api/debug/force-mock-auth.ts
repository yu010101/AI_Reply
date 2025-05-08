import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 開発環境でのみ実行可能
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'この操作は開発環境でのみ許可されています' });
  }

  try {
    // リクエストからユーザーIDを取得（デフォルトはログから確認した値）
    const userId = req.query.userId || 'ce223858-240b-4888-9087-fddf947dd020';
    
    console.log('[ForceMock] 強制モック認証を設定します:', { userId });
    
    // 現在時刻から1時間後をトークンの有効期限とする
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);
    
    // モックデータ
    const mockData = {
      access_token: 'forced-mock-access-token',
      refresh_token: 'forced-mock-refresh-token',
      expiry_date: expiryDate.toISOString(),
      userId: userId,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      forced: true
    };
    
    // レスポンスとしてJSONとHTMLスクリプトを返す
    // このAPIを直接呼び出すとローカルストレージにデータが設定される
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>強制モック認証設定</title>
        <script>
          // モックデータをローカルストレージに設定
          const mockData = ${JSON.stringify(mockData)};
          localStorage.setItem('mockGoogleAuthToken', JSON.stringify(mockData));
          console.log('[ForceMock] モックデータを設定しました:', mockData);
          
          // 3秒後に設定ページにリダイレクト
          setTimeout(() => {
            window.location.href = '/settings';
          }, 3000);
        </script>
      </head>
      <body>
        <h1>モック認証データを設定しました</h1>
        <p>3秒後に設定ページに移動します...</p>
        <p>ユーザーID: ${userId}</p>
        <pre>${JSON.stringify(mockData, null, 2)}</pre>
      </body>
    </html>
    `;
    
    // HTMLレスポンスを返す
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error: any) {
    console.error('[ForceMock] モック認証設定エラー:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 