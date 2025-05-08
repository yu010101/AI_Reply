-- Google Businessアカウントテーブルの作成
CREATE TABLE IF NOT EXISTS public.google_business_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    type TEXT NOT NULL,
    location_count INTEGER NOT NULL DEFAULT 0,
    primary_owner TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_google_business_accounts_tenant_id ON public.google_business_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_google_business_accounts_account_id ON public.google_business_accounts(account_id);

-- RLSポリシーの設定
ALTER TABLE public.google_business_accounts ENABLE ROW LEVEL SECURITY;

-- テナントごとのアクセス制御
CREATE POLICY "テナントは自身のアカウントのみアクセス可能" ON public.google_business_accounts
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- 更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.google_business_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 