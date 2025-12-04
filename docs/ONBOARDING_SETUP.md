# オンボーディング機能セットアップガイド

## 📋 概要

初期登録後のオンボーディング機能を有効化するためのセットアップ手順です。

## 🚀 セットアップ手順

### 1. データベースマイグレーションの実行

#### 方法A: Supabaseダッシュボードで実行（推奨）

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. `scripts/run-onboarding-migration.sql` の内容をコピーして実行
5. 実行結果を確認

#### 方法B: Supabase CLIで実行

```bash
# Supabaseプロジェクトにリンク（初回のみ）
npx supabase link --project-ref <your-project-ref>

# マイグレーションを実行
npx supabase db push
```

### 2. マイグレーションの確認

以下のSQLでマイグレーションが正常に適用されたか確認できます：

```sql
-- profilesテーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- onboarding_completedカラムの存在確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'onboarding_completed';

-- RLSポリシーの確認
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

### 3. 動作確認

#### 3.1 新規ユーザーでのテスト

1. 新しいアカウントで登録
2. ログイン後、ダッシュボードにアクセス
3. オンボーディングウィザードが表示されることを確認

#### 3.2 既存ユーザーの確認

既存ユーザーは `onboarding_completed = FALSE` として設定されているため、次回ログイン時にオンボーディングウィザードが表示されます。

特定のユーザーをスキップしたい場合：

```sql
-- 特定のユーザーのオンボーディングを完了としてマーク
UPDATE profiles 
SET onboarding_completed = TRUE 
WHERE email = 'user@example.com';
```

## 🔍 トラブルシューティング

### 問題1: オンボーディングウィザードが表示されない

**確認事項:**
- `profiles`テーブルに`onboarding_completed`カラムが存在するか
- ユーザーの`onboarding_completed`が`FALSE`になっているか
- ブラウザのコンソールにエラーがないか

**解決方法:**
```sql
-- ユーザーのオンボーディング状態を確認
SELECT id, email, onboarding_completed 
FROM profiles 
WHERE email = 'your-email@example.com';

-- オンボーディング未完了にリセット
UPDATE profiles 
SET onboarding_completed = FALSE 
WHERE email = 'your-email@example.com';
```

### 問題2: RLSポリシーエラー

**確認事項:**
- RLSが有効になっているか
- 適切なポリシーが設定されているか

**解決方法:**
```sql
-- RLSの状態を確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ポリシーを再作成
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);
```

### 問題3: マイグレーションエラー

**エラー例:**
```
ERROR: relation "profiles" does not exist
```

**解決方法:**
- `profiles`テーブルが存在しない場合は、マイグレーションSQLの`CREATE TABLE IF NOT EXISTS`部分が実行されます
- 既存のテーブル構造と競合する場合は、手動でカラムを追加してください

## 📝 チェックリスト

### マイグレーション前
- [ ] データベースのバックアップを取得
- [ ] マイグレーションSQLの内容を確認
- [ ] 既存の`profiles`テーブル構造を確認

### マイグレーション後
- [ ] `onboarding_completed`カラムが追加されたことを確認
- [ ] RLSポリシーが設定されたことを確認
- [ ] 既存ユーザーの`onboarding_completed`が`FALSE`になっていることを確認
- [ ] 新規ユーザーでオンボーディングウィザードが表示されることを確認

## 🎯 次のステップ

マイグレーションが完了したら：

1. **新規ユーザーでテスト**
   - 新しいアカウントで登録
   - オンボーディングウィザードが表示されることを確認
   - 各ステップを進めて完了まで確認

2. **既存ユーザーの対応**
   - 既存ユーザーにオンボーディングを表示するか、スキップするか決定
   - 必要に応じて一括更新SQLを実行

3. **カスタマイズ**
   - オンボーディングウィザードの内容を必要に応じてカスタマイズ
   - `src/components/onboarding/OnboardingWizard.tsx`を編集

## 📚 関連ドキュメント

- [データベースマイグレーションガイド](./DATABASE_MIGRATION.md)
- [ユーザーガイド](./user-guide.md)
- [セットアップガイド](./setup.md)
