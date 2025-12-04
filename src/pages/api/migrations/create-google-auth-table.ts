import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 開発環境またはマイグレーション実行環境でのみ実行可能
  const environment = process.env.NODE_ENV;
  const migrationKey = req.query.key;
  
  if (environment !== 'development' && migrationKey !== process.env.MIGRATION_KEY) {
    return res.status(403).json({ error: 'このエンドポイントは開発環境でのみ利用可能です' });
  }

  try {
    console.log('[migration] google_auth_tokensテーブル作成開始');
    
    // テーブルの存在確認
    const { error: checkError } = await supabase
      .from('google_auth_tokens')
      .select('*');
    const limitResult: any = await (supabase as any)
      .from('google_auth_tokens')
      .select('*')
      .limit(1);
    const checkData = limitResult.data;
    const checkError = limitResult.error;
      
    // テーブルが存在する場合は処理をスキップ
    if (!checkError) {
      console.log('[migration] テーブルは既に存在します');
      return res.status(200).json({ message: 'テーブルは既に存在します', success: true });
    }
    
    // テーブル作成のSQLクエリ
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS google_auth_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- テナントIDに対するインデックス
      CREATE INDEX IF NOT EXISTS idx_google_auth_tokens_tenant_id ON google_auth_tokens(tenant_id);
    `;
    
    // テーブル作成の実行
    const { error } = await supabase.rpc('exec_sql', { sql: createTableQuery });
    
    if (error) {
      // RPCメソッドがない場合、別の方法でSQL実行
      // 注意: この方法はセキュリティリスクがあるため、本番環境では使用しないこと
      console.error('[migration] RPC実行エラー:', error);
      
      // SQL文は実行できないため、フロントエンドに実行すべきSQLを返す
      return res.status(400).json({ 
        error: 'テーブル作成に失敗しました。以下のSQLを手動で実行してください。',
        sql: createTableQuery
      });
    }
    
    console.log('[migration] テーブル作成成功');
    return res.status(200).json({ message: 'テーブルを作成しました', success: true });
  } catch (error) {
    console.error('[migration] エラー:', error);
    return res.status(500).json({ 
      error: 'マイグレーション実行中にエラーが発生しました',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 