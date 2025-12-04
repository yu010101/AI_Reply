# Supabase CLIでオンボーディング機能のマイグレーションを実行する方法

## 方法1: Supabase CLIで直接実行（推奨）

### 前提条件
- Supabase CLIがインストールされていること（v2.65.5以上）
- Supabaseプロジェクトにアクセス権限があること

### 手順

1. **Supabaseプロジェクトにリンク**
   ```bash
   supabase link --project-ref fmonerzmxohwkisdagvm
   ```

2. **マイグレーションを実行**
   ```bash
   # オンボーディング機能のマイグレーションだけを実行
   supabase db push --include-all
   ```

   注意: 他のマイグレーションファイルにエラーがある場合は、一時的に除外してください。

## 方法2: 特定のマイグレーションファイルだけを実行

問題のあるマイグレーションファイルを一時的に除外して実行：

```bash
# 1. 問題のあるマイグレーションファイルをバックアップ
mv supabase/migrations/20250127000000_add_missing_rls_policies.sql \
   supabase/migrations/20250127000000_add_missing_rls_policies.sql.skip

# 2. マイグレーションを実行
supabase db push --include-all

# 3. バックアップから復元
mv supabase/migrations/20250127000000_add_missing_rls_policies.sql.skip \
   supabase/migrations/20250127000000_add_missing_rls_policies.sql
```

## 方法3: Supabaseダッシュボードで実行（最も確実）

1. Supabaseダッシュボードにアクセス
2. SQL Editorを開く
3. `scripts/run-onboarding-migration.sql`の内容をコピーして実行

## 実行するSQL

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
