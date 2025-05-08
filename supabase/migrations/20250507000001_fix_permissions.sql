-- 既存のポリシーを削除
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ挿入可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ参照可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ更新可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ削除可能" ON public.google_auth_tokens;

-- oauth_statesテーブルのポリシーも削除
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ挿入可能" ON public.oauth_states;
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ参照可能" ON public.oauth_states;
DROP POLICY IF EXISTS "ユーザーは自分のレコードのみ削除可能" ON public.oauth_states;

-- 新しいポリシーを作成（より緩和されたポリシー）
-- サービスロール（アプリケーションサーバー）からのアクセスを許可

-- google_auth_tokensテーブルのポリシー
CREATE POLICY "認証済みユーザーはアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "サービスロールはフルアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- oauth_statesテーブルのポリシー
CREATE POLICY "認証済みユーザーはアクセス可能" ON public.oauth_states
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "サービスロールはフルアクセス可能" ON public.oauth_states
  FOR ALL USING (auth.role() = 'service_role');

-- 匿名ユーザーからのアクセスも許可（開発環境のため）
CREATE POLICY "匿名ユーザーもアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "匿名ユーザーもアクセス可能" ON public.oauth_states
  FOR ALL USING (auth.role() = 'anon');

-- ROW LEVEL SECURITYを一時的に無効化するオプション（本番環境では推奨しません）
-- ALTER TABLE public.google_auth_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.oauth_states DISABLE ROW LEVEL SECURITY; 