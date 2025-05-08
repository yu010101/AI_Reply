// Supabaseテーブル存在確認スクリプト
const { createClient } = require('@supabase/supabase-js');

// 環境変数からSupabaseの設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Supabaseテーブル確認を開始します...');
  
  try {
    // テーブル一覧を取得
    const { data: tableList, error: tableError } = await supabase
      .from('_metadata')
      .select('tablename')
      .eq('tableowner', 'postgres');
    
    if (tableError) {
      console.error('テーブル一覧取得エラー:', tableError);
      return;
    }
    
    console.log('確認されたテーブル:', tableList);
    
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
    console.error('テーブル確認中にエラーが発生しました:', error);
  }
}

// スクリプト実行
checkTables(); 