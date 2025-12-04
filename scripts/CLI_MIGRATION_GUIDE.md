# Supabase CLIでオンボーディング機能のマイグレーションを実行する方法

## ⚠️ 注意事項

Supabase CLIでマイグレーションを実行する際、**すべてのマイグレーションファイル**が実行対象になります。
問題のあるマイグレーションファイルがある場合、エラーが発生します。

## 🎯 推奨方法: Supabaseダッシュボードで実行

最も確実な方法は、SupabaseダッシュボードのSQLエディタで実行することです。

1. Supabaseダッシュボードにアクセス
2. SQL Editorを開く
3. `scripts/run-onboarding-migration.sql`の内容をコピーして実行

## 🔧 Supabase CLIで実行する方法

### 前提条件
- Supabase CLI v2.65.5以上がインストールされていること
- Supabaseプロジェクトにアクセス権限があること

### 手順

#### 1. プロジェクトにリンク

```bash
supabase link --project-ref fmonerzmxohwkisdagvm
```

#### 2. 問題のあるマイグレーションファイルを一時的に除外

```bash
# 問題のあるマイグレーションファイルをバックアップ
mv supabase/migrations/20250127000000_add_missing_rls_policies.sql \
   supabase/migrations/20250127000000_add_missing_rls_policies.sql.skip

mv supabase/migrations/20250127000001_create_performance_metrics.sql \
   supabase/migrations/20250127000001_create_performance_metrics.sql.skip
```

#### 3. マイグレーションを実行

```bash
supabase db push --include-all --yes
```

#### 4. バックアップから復元

```bash
mv supabase/migrations/20250127000000_add_missing_rls_policies.sql.skip \
   supabase/migrations/20250127000000_add_missing_rls_policies.sql

mv supabase/migrations/20250127000001_create_performance_metrics.sql.skip \
   supabase/migrations/20250127000001_create_performance_metrics.sql
```

## 📝 実行するSQL

```sql
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
```

## ✅ 実行後の確認

```sql
-- onboarding_completedカラムの存在確認
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'onboarding_completed';

-- 既存ユーザーの状態確認
SELECT id, email, onboarding_completed 
FROM profiles 
LIMIT 5;
```
