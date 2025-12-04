# Supabase CLIでオンボーディング機能のマイグレーションを実行する方法

## ⚠️ 重要な注意事項

Supabase CLIの`db push`コマンドは、**リモートデータベースのマイグレーション履歴をチェック**します。
そのため、ローカルのマイグレーションファイルを除外しても、リモートの履歴に基づいてすべてのマイグレーションが実行対象になります。

問題のあるマイグレーションファイル（`20250127000000_add_missing_rls_policies.sql`）が存在する場合、
オンボーディング機能のマイグレーションだけを実行することはできません。

## 🎯 推奨方法: Supabaseダッシュボードで実行

最も確実で簡単な方法は、SupabaseダッシュボードのSQLエディタで実行することです。

### 手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard
   - プロジェクト `fmonerzmxohwkisdagvm` を選択

2. **SQLエディタを開く**
   - 左サイドバーから「SQL Editor」をクリック

3. **マイグレーションSQLを実行**
   - `scripts/run-onboarding-migration.sql` の内容をコピー
   - SQLエディタに貼り付けて「Run」をクリック

4. **実行結果を確認**
   - 「Success」と表示されれば成功
   - 確認クエリの結果で `onboarding_completed` カラムが追加されたことを確認

## 🔧 Supabase CLIで実行する場合（上級者向け）

### 前提条件
- 問題のあるマイグレーションファイルを修正済みであること
- または、問題のあるマイグレーションが既に実行済みであること

### 手順

```bash
# 1. プロジェクトにリンク
supabase link --project-ref fmonerzmxohwkisdagvm

# 2. マイグレーションを実行
supabase db push --include-all --yes
```

### エラーが発生する場合

問題のあるマイグレーションファイルを修正するか、Supabaseダッシュボードで実行してください。

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
