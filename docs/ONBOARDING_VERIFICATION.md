# オンボーディング機能の動作確認ガイド

## ✅ マイグレーション確認

マイグレーションが正常に実行されたか確認するには、SupabaseダッシュボードのSQLエディタで以下を実行してください：

```sql
-- onboarding_completedカラムの存在確認
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'onboarding_completed';

-- 既存ユーザーの状態確認
SELECT 
  id, 
  email, 
  onboarding_completed,
  created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- RLSポリシーの確認
SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
```

## 🧪 動作確認手順

### 1. 既存ユーザーでの確認

既存ユーザーは `onboarding_completed = FALSE` として設定されているため、次回ログイン時にオンボーディングウィザードが表示されます。

1. 既存のアカウントでログイン
2. ダッシュボードにアクセス
3. オンボーディングウィザードが表示されることを確認

### 2. 新規ユーザーでの確認

1. 新しいアカウントで登録
2. ログイン後、ダッシュボードにアクセス
3. オンボーディングウィザードが表示されることを確認
4. ウィザードの各ステップを完了
5. 完了後、通常のダッシュボードが表示されることを確認

### 3. オンボーディング完了後の確認

オンボーディングを完了したユーザーは、次回ログイン時にウィザードが表示されません。

1. オンボーディングを完了したアカウントでログアウト
2. 再度ログイン
3. オンボーディングウィザードが表示されず、通常のダッシュボードが表示されることを確認

## 🔧 トラブルシューティング

### オンボーディングウィザードが表示されない場合

1. ブラウザのコンソールでエラーを確認
2. `profiles`テーブルに`onboarding_completed`カラムが存在するか確認
3. ユーザーの`onboarding_completed`の値を確認：

```sql
SELECT id, email, onboarding_completed 
FROM profiles 
WHERE id = 'your-user-id';
```

### オンボーディングが完了しない場合

1. ブラウザのコンソールでエラーを確認
2. RLSポリシーが正しく設定されているか確認
3. APIエンドポイント `/api/onboarding/complete` が正常に動作しているか確認

### 特定のユーザーのオンボーディングをスキップしたい場合

```sql
UPDATE profiles 
SET onboarding_completed = TRUE 
WHERE id = 'user-id';
```

### 特定のユーザーのオンボーディングをリセットしたい場合

```sql
UPDATE profiles 
SET onboarding_completed = FALSE 
WHERE id = 'user-id';
```

## 📊 統計情報の確認

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed_users,
  COUNT(*) FILTER (WHERE onboarding_completed = FALSE) as pending_users,
  COUNT(*) FILTER (WHERE onboarding_completed IS NULL) as null_users
FROM profiles;
```

