import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 開発環境でのみ実行可能
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'この操作は開発環境でのみ許可されています' });
  }

  try {
    // 環境変数の状態を確認
    const rootDir = process.cwd();
    console.log('[ENV検証] カレントディレクトリ:', rootDir);
    
    // 環境変数ファイルの存在確認
    const envFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
    ];
    
    const fileStatus = {};
    
    for (const file of envFiles) {
      const filePath = path.join(rootDir, file);
      try {
        const exists = fs.existsSync(filePath);
        if (exists) {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim() !== '');
          
          // 機密情報なしでキー一覧を取得
          const keys = lines
            .filter(line => !line.startsWith('#') && line.includes('='))
            .map(line => line.split('=')[0].trim());
          
          fileStatus[file] = {
            exists,
            size: stats.size,
            lineCount: lines.length,
            keys,
            hasGoogleClientId: keys.includes('GOOGLE_CLIENT_ID'),
            hasGoogleClientSecret: keys.includes('GOOGLE_CLIENT_SECRET'),
            hasMockGoogleAuth: keys.includes('MOCK_GOOGLE_AUTH')
          };
        } else {
          fileStatus[file] = { exists: false };
        }
      } catch (error) {
        fileStatus[file] = { exists: false, error: error.message };
      }
    }
    
    // 現在の環境変数（機密情報は一部マスク）
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MOCK_GOOGLE_AUTH: process.env.MOCK_GOOGLE_AUTH,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID 
        ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 6)}...` 
        : '未設定',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET 
        ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 3)}...` 
        : '未設定',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };
    
    // HTMLレスポンス
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>環境変数の検証</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
          section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
          .file-exists { color: green; }
          .file-missing { color: red; }
        </style>
      </head>
      <body>
        <h1>環境変数の検証</h1>
        
        <section>
          <h2>現在の環境変数</h2>
          <pre>${JSON.stringify(envInfo, null, 2)}</pre>
        </section>
        
        <section>
          <h2>環境変数ファイルの状態</h2>
          <ul>
            ${Object.entries(fileStatus).map(([file, status]) => `
              <li class="${status.exists ? 'file-exists' : 'file-missing'}">
                ${file}: ${status.exists ? '存在します' : '存在しません'}
                ${status.exists ? `(${status.lineCount}行, ${status.size}バイト)` : ''}
                ${status.exists ? `<pre>${JSON.stringify(status, null, 2)}</pre>` : ''}
              </li>
            `).join('')}
          </ul>
        </section>
        
        <div>
          <h2>推奨アクション</h2>
          <p>1. .env.localファイルが存在し、必要な環境変数が設定されていることを確認してください</p>
          <p>2. 必要な環境変数：GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MOCK_GOOGLE_AUTH=false</p>
          <p>3. アプリを再起動してください</p>
        </div>
        
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
    console.error('[ENV検証] エラー:', error);
    return res.status(500).json({ 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 