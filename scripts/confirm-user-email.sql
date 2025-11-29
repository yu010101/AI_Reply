-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください
-- https://app.supabase.com/project/fmonerzmxohwkisdagvm/sql

-- testuser@gmail.comのメール確認を完了させる
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'testuser@gmail.com';

-- 確認
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'testuser@gmail.com';
