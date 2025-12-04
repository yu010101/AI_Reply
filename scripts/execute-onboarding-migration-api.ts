import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Supabase Management APIを使用してオンボーディング機能のマイグレーションを実行
 * 
 * 使用方法:
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key npx ts-node scripts/execute-onboarding-migration-api.ts
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmonerzmxohwkisdagvm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  console.error('');
  console.error('Supabaseダッシュボードから取得してください:');
  console.error('  Settings → API → service_role key (secret)');
  console.error('');
  console.error('使用方法:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('  npx ts-node scripts/execute-onboarding-migration-api.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  console.log('==========================================');
  console.log('オンボーディング機能のマイグレーション実行');
  console.log('==========================================');
  console.log('');

  // マイグレーションSQLファイルを読み込み
  const migrationFile = path.join(__dirname, '../scripts/run-onboarding-migration.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

  try {
    console.log('マイグレーションSQLを読み込みました');
    console.log('');

    // Supabase Management APIを使用してSQLを実行
    // 注意: Supabase JSクライアントには直接SQL実行機能がないため、
    // REST APIを使用する必要があります
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (!response.ok) {
      // exec_sql関数が存在しない場合は、別の方法を試す
      console.log('⚠️  Management APIのexec_sql関数が利用できません');
      console.log('');
      console.log('代わりに、SupabaseダッシュボードのSQLエディタで以下を実行してください:');
      console.log('==========================================');
      console.log(migrationSQL);
      console.log('==========================================');
      return;
    }

    const result = await response.json();
    console.log('✅ マイグレーションが正常に完了しました！');
    console.log('');
    console.log('結果:', result);
    
  } catch (error: any) {
    console.error('❌ マイグレーション実行エラー:', error.message);
    console.error('');
    console.error('SupabaseダッシュボードのSQLエディタで以下を実行してください:');
    console.log('==========================================');
    console.log(migrationSQL);
    console.log('==========================================');
    process.exit(1);
  }
}

executeMigration();
