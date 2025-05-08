-- Google認証トークンを保存するテーブルを作成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.google_auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テナントIDのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_google_auth_tokens_tenant_id ON public.google_auth_tokens(tenant_id);

-- RLS (行レベルセキュリティ)
ALTER TABLE public.google_auth_tokens ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分のレコードのみ参照可能
CREATE POLICY "ユーザーは自分のレコードのみ参照可能" ON public.google_auth_tokens
  FOR SELECT USING (auth.uid() = tenant_id);

-- ポリシー: 自分のレコードのみ挿入可能
CREATE POLICY "ユーザーは自分のレコードのみ挿入可能" ON public.google_auth_tokens
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- ポリシー: 自分のレコードのみ更新可能
CREATE POLICY "ユーザーは自分のレコードのみ更新可能" ON public.google_auth_tokens
  FOR UPDATE USING (auth.uid() = tenant_id);

-- ポリシー: 自分のレコードのみ削除可能
CREATE POLICY "ユーザーは自分のレコードのみ削除可能" ON public.google_auth_tokens
  FOR DELETE USING (auth.uid() = tenant_id);

-- OAuth状態を保存するためのテーブル
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テナントIDとstate値のインデックスを作成
CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant_id ON public.oauth_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);

-- RLS (行レベルセキュリティ)
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分のレコードのみ参照可能
CREATE POLICY "ユーザーは自分のレコードのみ参照可能" ON public.oauth_states
  FOR SELECT USING (auth.uid() = tenant_id);

-- ポリシー: 自分のレコードのみ挿入可能
CREATE POLICY "ユーザーは自分のレコードのみ挿入可能" ON public.oauth_states
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- ポリシー: 自分のレコードのみ削除可能
CREATE POLICY "ユーザーは自分のレコードのみ削除可能" ON public.oauth_states
  FOR DELETE USING (auth.uid() = tenant_id); 