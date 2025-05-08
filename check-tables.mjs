// Supabaseテーブル存在確認スクリプト
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 現在のスクリプトのディレクトリパス
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数のロード
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数がない場合は.env.localから読み込む
if (!supabaseUrl || !supabaseKey) {
  try {
    const envFile = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    
    if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
    if (keyMatch && keyMatch[1]) supabaseKey = keyMatch[1].trim();
    
    console.log(`環境変数を.env.localから読み込みました: URL=${supabaseUrl?.substring(0, 10)}...`);
  } catch (error) {
    console.error('環境変数の読み込みに失敗しました:', error);
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase接続情報が設定されていません。');
  console.log('node_modulesからインポートしてみます...');
  try {
    const { supabase } = await import('./src/utils/supabase.js');
    checkTablesWithClient(supabase);
    process.exit(0);
  } catch (importError) {
    console.error('インポートに失敗しました:', importError);
    process.exit(1);
  }
}

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Supabaseテーブル確認を開始します...');
  
  try {
    // information_schemaからテーブル一覧を取得
    const { data: tableList, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tableError) {
      console.error('テーブル一覧取得エラー:', tableError);
      
      // 権限などの問題でinformation_schemaにアクセスできない場合、直接テーブルをチェック
      console.log('直接テーブルをチェックします...');
      await checkTablesDirectly();
      return;
    }
    
    console.log('確認されたテーブル:', tableList?.map(t => t.table_name).join(', ') || 'なし');
    
    // テーブルが存在するか確認
    const hasGoogleAuthTokens = tableList?.some(t => t.table_name === 'google_auth_tokens') || false;
    const hasOauthStates = tableList?.some(t => t.table_name === 'oauth_states') || false;
    
    console.log('テーブル存在確認:', {
      google_auth_tokens: hasGoogleAuthTokens ? '存在します' : '存在しません',
      oauth_states: hasOauthStates ? '存在します' : '存在しません'
    });
    
    // 各テーブルの詳細を確認
    if (hasGoogleAuthTokens) {
      await checkTableColumns('google_auth_tokens');
    }
    
    if (hasOauthStates) {
      await checkTableColumns('oauth_states');
    }
    
    // RLS設定を確認
    await checkRLS();
  } catch (error) {
    console.error('テーブル確認中にエラーが発生しました:', error);
  }
}

async function checkTablesDirectly() {
  try {
    // google_auth_tokensテーブルの確認
    const { data: authTokens, error: authError } = await supabase
      .from('google_auth_tokens')
      .select('id')
      .limit(1);
    
    if (authError) {
      console.error('google_auth_tokensテーブル確認エラー:', authError);
    } else {
      console.log('google_auth_tokensテーブルは正常に存在します。');
    }
    
    // oauth_statesテーブルの確認
    const { data: oauthStates, error: oauthError } = await supabase
      .from('oauth_states')
      .select('id')
      .limit(1);
    
    if (oauthError) {
      console.error('oauth_statesテーブル確認エラー:', oauthError);
    } else {
      console.log('oauth_statesテーブルは正常に存在します。');
    }
  } catch (error) {
    console.error('直接テーブル確認中にエラーが発生しました:', error);
  }
}

async function checkTableColumns(tableName) {
  try {
    // information_schemaからカラム情報を取得
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (columnError) {
      console.error(`${tableName}のカラム一覧取得エラー:`, columnError);
      return;
    }
    
    console.log(`${tableName}のカラム:`, columns);
  } catch (error) {
    console.error(`${tableName}のカラム確認中にエラーが発生しました:`, error);
  }
}

async function checkRLS() {
  try {
    // RLS設定の確認（直接クエリできないので、管理用関数を使用）
    const { data: rlsSettings, error: rlsError } = await supabase
      .rpc('check_rls_settings');
    
    if (rlsError) {
      console.error('RLS設定確認エラー:', rlsError);
      console.log('注: check_rls_settings関数が定義されていない場合はこのエラーは正常です');
      return;
    }
    
    console.log('RLS設定:', rlsSettings);
  } catch (error) {
    console.error('RLS設定確認中にエラーが発生しました:', error);
  }
}

function checkTablesWithClient(client) {
  console.log('インポートされたクライアントを使ってテーブルを確認します...');
  
  async function runChecks() {
    try {
      // google_auth_tokensテーブルの確認
      const { data: authTokens, error: authError } = await client
        .from('google_auth_tokens')
        .select('id')
        .limit(1);
      
      if (authError) {
        console.error('google_auth_tokensテーブル確認エラー:', authError);
      } else {
        console.log('google_auth_tokensテーブルは正常に存在します。レコード数:', authTokens.length);
      }
      
      // oauth_statesテーブルの確認
      const { data: oauthStates, error: oauthError } = await client
        .from('oauth_states')
        .select('id')
        .limit(1);
      
      if (oauthError) {
        console.error('oauth_statesテーブル確認エラー:', oauthError);
      } else {
        console.log('oauth_statesテーブルは正常に存在します。レコード数:', oauthStates.length);
      }
    } catch (error) {
      console.error('テーブル確認中にエラーが発生しました:', error);
    }
  }
  
  runChecks();
}

// スクリプト実行
checkTables(); 