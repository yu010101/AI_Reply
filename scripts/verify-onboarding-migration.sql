-- オンボーディング機能のマイグレーション確認クエリ

-- 1. onboarding_completedカラムの存在確認
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'onboarding_completed';

-- 2. 既存ユーザーのonboarding_completed状態確認
SELECT 
  id, 
  email, 
  onboarding_completed,
  created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 3. RLSポリシーの確認
SELECT 
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. 統計情報
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) as completed_users,
  COUNT(*) FILTER (WHERE onboarding_completed = FALSE) as pending_users,
  COUNT(*) FILTER (WHERE onboarding_completed IS NULL) as null_users
FROM profiles;

