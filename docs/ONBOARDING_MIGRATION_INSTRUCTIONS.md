# オンボーディング機能マイグレーション実行手順

## 🎯 実行方法

### 方法1: Supabaseダッシュボードで実行（推奨・最も簡単）

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にログイン
   - プロジェクト `fmonerzmxohwkisdagvm` を選択

2. **SQLエディタを開く**
   - 左サイドバーから「SQL Editor」をクリック

3. **マイグレーションSQLを実行**
   - 以下のSQLをコピーしてSQLエディタに貼り付け
   - 「Run」ボタンをクリックして実行

```sql
-- オンボーディング機能のマイグレーション
-- profilesテーブルにonboarding_completedカラムを追加

-- profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'user',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のprofilesテーブルにonboarding_completedカラムを追加（存在しない場合）
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

-- RLSポリシー（既に存在する場合はスキップ）
DO $$
BEGIN
  -- RLSを有効化
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  
  -- ポリシーが存在しない場合のみ作成
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

4. **実行結果を確認**
   - 「Success. No rows returned」と表示されれば成功
   - エラーが表示された場合は、エラーメッセージを確認

5. **確認クエリを実行**
   - 以下のSQLでマイグレーションが正常に適用されたか確認

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

## ✅ 実行後の確認

### 1. カラムの存在確認

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

期待される結果：
- `onboarding_completed` カラムが `BOOLEAN` 型で存在
- `column_default` が `false`

### 2. RLSポリシーの確認

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

期待される結果：
- `Users can view own profile` ポリシーが存在
- `Users can update own profile` ポリシーが存在

### 3. 既存ユーザーの状態確認

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed_users,
  COUNT(*) FILTER (WHERE onboarding_completed = FALSE) as pending_users
FROM profiles;
```

期待される結果：
- 既存ユーザーはすべて `onboarding_completed = FALSE`

## 🧪 動作確認

### テスト手順

1. **新規ユーザーで登録**
   - 新しいメールアドレスでアカウントを作成
   - ログイン後、ダッシュボードにアクセス

2. **オンボーディングウィザードの表示確認**
   - オンボーディングウィザードが自動的に表示されることを確認
   - 5つのステップが順番に表示されることを確認

3. **各ステップの動作確認**
   - ステップ0（ようこそ）: アプリの機能説明が表示される
   - ステップ1（店舗情報）: 店舗名と住所を入力できる
   - ステップ2（Google連携）: 連携手順が説明される
   - ステップ3（プラン選択）: プラン説明が表示される
   - ステップ4（完了）: 完了メッセージが表示される

4. **完了後の確認**
   - 「ダッシュボードへ」ボタンをクリック
   - 通常のダッシュボードが表示されることを確認
   - 再度アクセスしてもオンボーディングウィザードが表示されないことを確認

## 🔧 トラブルシューティング

### エラー: "relation 'profiles' does not exist"

**原因**: `profiles`テーブルが存在しない

**解決方法**: 
- マイグレーションSQLの`CREATE TABLE IF NOT EXISTS`部分が実行されます
- それでもエラーが出る場合は、手動でテーブルを作成してください

### エラー: "column 'onboarding_completed' already exists"

**原因**: カラムが既に存在している

**解決方法**: 
- このエラーは無視して問題ありません
- `DO $$ ... END $$;` ブロックが既存のカラムをスキップします

### エラー: "permission denied"

**原因**: 権限不足

**解決方法**: 
- Supabaseダッシュボードの管理者権限で実行してください
- または、サービスロールキーを使用してください

## 📝 次のステップ

マイグレーションが完了したら：

1. ✅ 動作確認を実施
2. ✅ 既存ユーザーへの通知（必要に応じて）
3. ✅ オンボーディングウィザードのカスタマイズ（必要に応じて）

## 📚 関連ファイル

- マイグレーションファイル: `supabase/migrations/20250127000002_add_onboarding_completed.sql`
- 実行用SQL: `scripts/run-onboarding-migration.sql`
- セットアップガイド: `docs/ONBOARDING_SETUP.md`
