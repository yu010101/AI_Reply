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
    console.log('[デバッグ] モック認証設定開始');
    
    // モックデータをレスポンスとしてHTMLページを返す
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>モック認証設定</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .success { color: green; }
          .error { color: red; }
          button { padding: 10px; margin: 10px 0; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>開発環境用モック認証設定</h1>
        <p>このページは開発環境でGoogle認証の代わりにモックデータを設定するためのものです。</p>
        
        <div id="status"></div>
        
        <button id="setupButton">モック認証を設定する</button>
        <button id="clearButton">モック認証をクリアする</button>
        
        <div id="redirect" style="margin-top: 20px;">
          <a href="/settings">設定画面に戻る</a>
        </div>
        
        <script>
          // モック認証を設定
          document.getElementById('setupButton').addEventListener('click', function() {
            try {
              const statusEl = document.getElementById('status');
              
              // 現在時刻から1時間後をトークンの有効期限とする
              const expiryDate = new Date();
              expiryDate.setHours(expiryDate.getHours() + 1);
              
              // モックデータを作成
              const mockData = {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                expiry_date: expiryDate.toISOString(),
                userId: 'ce223858-240b-4888-9087-fddf947dd020',
                updated_at: new Date().toISOString()
              };
              
              // ローカルストレージに保存
              localStorage.setItem('mockGoogleAuthToken', JSON.stringify(mockData));
              
              statusEl.innerHTML = '<p class="success">モック認証データを設定しました！</p>';
              statusEl.innerHTML += '<pre>' + JSON.stringify(mockData, null, 2) + '</pre>';
              
              // クリップボードにコピー
              navigator.clipboard.writeText(JSON.stringify(mockData))
                .then(() => {
                  statusEl.innerHTML += '<p>データをクリップボードにコピーしました</p>';
                })
                .catch(err => {
                  console.error('クリップボードエラー:', err);
                });
            } catch (error) {
              console.error('設定エラー:', error);
              document.getElementById('status').innerHTML = 
                '<p class="error">エラーが発生しました: ' + error.message + '</p>';
            }
          });
          
          // モック認証をクリア
          document.getElementById('clearButton').addEventListener('click', function() {
            try {
              localStorage.removeItem('mockGoogleAuthToken');
              document.getElementById('status').innerHTML = 
                '<p class="success">モック認証データをクリアしました</p>';
            } catch (error) {
              console.error('クリアエラー:', error);
              document.getElementById('status').innerHTML = 
                '<p class="error">エラーが発生しました: ' + error.message + '</p>';
            }
          });
        </script>
      </body>
    </html>
    `;
    
    // HTMLレスポンスを返す
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error: any) {
    console.error('[デバッグ] モック認証設定エラー:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 