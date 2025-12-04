import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 認証済みユーザーかチェック（開発環境では省略可）
    const { data: { session } } = await supabase.auth.getSession();
    
    // 環境変数情報の収集
    const envInfo = {
      mockGoogleAuth: process.env.MOCK_GOOGLE_AUTH,
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    };
    
    // DB情報の収集（テーブル確認）
    let dbInfo: any = { error: '認証が必要です' };
    
    if (session) {
      try {
        // テーブル一覧の取得
        const { data, error } = await supabase.rpc('get_tables');
        
        if (error) {
          // RPC関数がない場合は、別の方法でテーブル確認
          const { data: schemaData, error: schemaError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
          dbInfo = {
            tables: schemaData || [],
            schemaError: schemaError?.message || null,
          };
        } else {
          dbInfo = {
            tables: data || [],
            error: null,
          };
        }
        
        // google_auth_tokensテーブルの有無を確認
        let hasGoogleAuthTable = false;
        let googleAuthTableFields: string[] = [];
        
        try {
          const { data: tableInfo, error: tableError } = await supabase
            .from('google_auth_tokens')
            .select('*')
            .limit(0);
            
          hasGoogleAuthTable = !tableError;
          
          if (!tableError && tableInfo) {
            googleAuthTableFields = Object.keys(tableInfo[0] || {});
          }
        } catch (e) {
          // テーブルが存在しない
        }
        
        dbInfo = {
          ...dbInfo,
          hasGoogleAuthTable,
          googleAuthTableFields,
        };
      } catch (e) {
        dbInfo = {
          error: '情報取得エラー: ' + (e instanceof Error ? e.message : String(e)),
        };
      }
    }
    
    // ディスク容量情報（Node.jsから直接取得することはできないため、エラーログの有無を返す）
    const diskInfo = {
      hasEnospcErrors: false, // ここは実際のログからは確認できない
    };
    
    res.status(200).json({
      env: envInfo,
      db: dbInfo,
      disk: diskInfo,
      session: {
        isAuthenticated: !!session,
        userId: session?.user?.id,
      }
    });
  } catch (error) {
    console.error('[debug/check-mock]エラー:', error);
    res.status(500).json({
      error: '診断中にエラーが発生しました',
      message: error instanceof Error ? error.message : String(error),
    });
  }
} 