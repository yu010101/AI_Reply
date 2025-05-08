// Google認証トークンをリセットするスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません。.env.localファイルを確認してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetGoogleAuth() {
  console.log('Google認証トークンのリセットを開始します...');
  
  try {
    // 引数からユーザーIDを取得（オプション）
    const userId = process.argv[2];
    
    if (userId) {
      console.log(`ユーザーID "${userId}" のトークンを削除します...`);
      const { error } = await supabase
        .from('google_auth_tokens')
        .delete()
        .eq('tenant_id', userId);
      
      if (error) throw error;
    } else {
      // まず全レコードを取得
      const { data, error: selectError } = await supabase
        .from('google_auth_tokens')
        .select('id, tenant_id');
      
      if (selectError) throw selectError;
      
      console.log(`${data.length}件のトークンが見つかりました。削除を開始します...`);
      
      // 各レコードを個別に削除
      for (const token of data) {
        console.log(`  トークンID: ${token.id}, ユーザーID: ${token.tenant_id} を削除中...`);
        const { error: deleteError } = await supabase
          .from('google_auth_tokens')
          .delete()
          .eq('id', token.id);
        
        if (deleteError) {
          console.warn(`  ⚠️ 削除エラー: ${deleteError.message}`);
        }
      }
    }
    
    console.log('✅ トークンの削除が完了しました');
    console.log('再度アプリケーションにログインして認証をやり直してください');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  } finally {
    process.exit(0);
  }
}

resetGoogleAuth(); 