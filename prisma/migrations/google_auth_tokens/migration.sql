-- Google認証トークンを管理するテーブルを作成
CREATE TABLE IF NOT EXISTS "google_auth_tokens" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "tenant_id" UUID NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expiry_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT "google_auth_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "google_auth_tokens_tenant_id_unique" UNIQUE ("tenant_id")
);

-- テナントテーブルとの外部キー制約（存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants'
  ) THEN
    ALTER TABLE "google_auth_tokens" 
    ADD CONSTRAINT "google_auth_tokens_tenant_id_fkey" 
    FOREIGN KEY ("tenant_id") 
    REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Foreign key constraint not added. Tenant table might not exist.';
END $$; 