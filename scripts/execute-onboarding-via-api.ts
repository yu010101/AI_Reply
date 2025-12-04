import { createClient } from '@supabase/supabase-js';

// Supabase Management APIを使用してSQLを実行するスクリプト
// 注意: この方法はSupabase Management APIのアクセストークンが必要です

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmonerzmxohwkisdagvm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  const migrationSQL = `
-- profilesテーブルにonboarding_completedカラムを追加
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'user',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のprofilesテーブルにonboarding_completedカラムを追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 既存ユーザーはオンボーディング未完了として設定
UPDATE profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;

-- RLSポリシー
DO $$
BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON profiles 
      FOR SELECT USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles 
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
`;

  try {
    // Supabase Management APIを使用してSQLを実行
    // 注意: Supabase JSクライアントには直接SQL実行機能がないため、
    // この方法は使用できません。代わりにSupabaseダッシュボードで実行してください。
    
    console.log('このスクリプトはSupabase Management APIの直接SQL実行をサポートしていません。');
    console.log('代わりに、SupabaseダッシュボードのSQLエディタで以下を実行してください:');
    console.log('');
    console.log(migrationSQL);
    
    // または、RPC関数を使用する方法
    // const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
  } catch (error) {
    console.error('マイグレーション実行エラー:', error);
    process.exit(1);
  }
}

executeMigration();
