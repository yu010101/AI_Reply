// Supabaseのテーブル確認（アプリ内クライアント使用）
const path = require('path');
const fs = require('fs');

// 環境変数を読み込む関数
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && match[1] && match[2]) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {  // 既存の環境変数を上書きしない
            process.env[key] = value;
          }
        }
      });
      console.log(`環境変数を${path.basename(filePath)}から読み込みました`);
      return true;
    }
  } catch (error) {
    console.error(`${path.basename(filePath)}の読み込みに失敗しました:`, error);
  }
  return false;
}

// 優先順位を付けて環境変数ファイルを読み込む
const envLocal = path.join(__dirname, '.env.local');
const envDev = path.join(__dirname, '.env.development');
const envDefault = path.join(__dirname, '.env');

let loaded = loadEnvFile(envLocal);
loaded = loadEnvFile(envDev) || loaded;
loaded = loadEnvFile(envDefault) || loaded;

if (!loaded) {
  console.error('環境変数ファイルが読み込めませんでした。');
}

// Supabaseクライアントを作成
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase接続情報が設定されていません。');
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key: ${supabaseKey.substring(0, 10)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Supabaseテーブル確認を開始します...');
  
  try {
    // google_auth_tokensテーブルの確認
    const { data: authTokens, error: authError } = await supabase
      .from('google_auth_tokens')
      .select('id')
      .limit(1);
    
    if (authError) {
      console.error('google_auth_tokensテーブル確認エラー:', authError);
    } else {
      console.log('google_auth_tokensテーブルは正常に存在します。レコード数:', authTokens?.length || 0);
    }
    
    // oauth_statesテーブルの確認
    const { data: oauthStates, error: oauthError } = await supabase
      .from('oauth_states')
      .select('id')
      .limit(1);
    
    if (oauthError) {
      console.error('oauth_statesテーブル確認エラー:', oauthError);
    } else {
      console.log('oauth_statesテーブルは正常に存在します。レコード数:', oauthStates?.length || 0);
    }
  } catch (error) {
    console.error('テーブル確認中にエラーが発生しました:', error);
  }
}

// スクリプト実行
async function runChecks() {
  await checkTables();
  await checkTableStructure();
  await checkRowLevelSecurity();
}

async function checkTableStructure() {
  console.log('\n=== テーブル構造の確認 ===');
  
  try {
    // google_auth_tokensテーブル構造の確認
    const { data, error } = await supabase
      .rpc('get_table_schema', { table_name: 'google_auth_tokens' });
    
    if (error) {
      console.error('テーブル構造取得エラー:', error);
      
      // 直接クエリで確認
      console.log('直接クエリでサンプルデータを確認します...');
      const { data: sample, error: sampleError } = await supabase
        .from('google_auth_tokens')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('サンプルデータ取得エラー:', sampleError);
      } else if (sample && sample.length > 0) {
        console.log('google_auth_tokensテーブルのフィールド:', Object.keys(sample[0]));
      } else {
        console.log('google_auth_tokensテーブルにデータがありません');
        
        // テーブルにダミーデータを挿入して構造を確認
        console.log('ダミーデータを一時的に挿入して構造を確認します...');
        const dummyData = {
          tenant_id: '00000000-0000-0000-0000-000000000000',
          access_token: 'dummy_access_token',
          refresh_token: 'dummy_refresh_token',
          expiry_date: new Date(Date.now() + 3600000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('google_auth_tokens')
          .insert(dummyData)
          .select();
        
        if (insertError) {
          console.error('ダミーデータ挿入エラー:', insertError);
          console.log('必要なフィールド:', Object.keys(dummyData));
        } else {
          console.log('ダミーデータ挿入成功:', insertData);
          
          // すぐに削除
          const { error: deleteError } = await supabase
            .from('google_auth_tokens')
            .delete()
            .eq('tenant_id', '00000000-0000-0000-0000-000000000000');
          
          if (deleteError) {
            console.error('ダミーデータ削除エラー:', deleteError);
          } else {
            console.log('ダミーデータを削除しました');
          }
        }
      }
    } else {
      console.log('google_auth_tokensテーブルの構造:', data);
    }
  } catch (error) {
    console.error('テーブル構造確認中にエラーが発生しました:', error);
  }
}

async function checkRowLevelSecurity() {
  console.log('\n=== 行レベルセキュリティ(RLS)の確認 ===');
  
  try {
    // RLS設定の直接確認（管理者権限が必要）
    const { data, error } = await supabase
      .rpc('check_rls_status');
    
    if (error) {
      console.error('RLS確認エラー:', error);
      console.log('※RLS確認には特別な関数が必要です。Supabaseダッシュボードで確認してください。');
      
      // 代替方法：他のユーザーのデータにアクセスを試みる
      console.log('他のユーザーデータへのアクセスを試みます（RLSが有効なら失敗するはず）...');
      
      const { data: anyData, error: anyError } = await supabase
        .from('google_auth_tokens')
        .select('tenant_id')
        .neq('tenant_id', '00000000-0000-0000-0000-000000000000')
        .limit(1);
      
      if (anyError) {
        console.log('他ユーザーデータアクセス失敗:', anyError);
        console.log('👍 良い兆候です - RLSが有効で他ユーザーのデータにアクセスできません');
      } else if (anyData && anyData.length > 0) {
        console.log('⚠️ 警告: 他ユーザーデータにアクセスできました:', anyData);
        console.log('RLSが無効か、ポリシーが適切に設定されていない可能性があります');
      } else {
        console.log('他ユーザーのデータは見つかりませんでした（テーブルが空か、RLSが有効）');
      }
    } else {
      console.log('RLS設定:', data);
    }
  } catch (error) {
    console.error('RLS確認中にエラーが発生しました:', error);
  }
}

runChecks(); 