-- ============================================
-- Complete Schema Fix - Add missing columns and RLS
-- Date: 2025-12-10
-- ============================================

-- ============================================
-- Add tenant_id to reviews
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Add updated_at to reviews if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create index on reviews.tenant_id
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews(tenant_id);

-- ============================================
-- Create replies table
-- ============================================
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_tenant_id ON replies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_replies_review_id ON replies(review_id);

-- ============================================
-- RLS for locations
-- ============================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own locations" ON locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON locations;
DROP POLICY IF EXISTS "Users can update own locations" ON locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON locations;

CREATE POLICY "Users can view own locations" ON locations
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own locations" ON locations
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own locations" ON locations
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own locations" ON locations
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================
-- RLS for reviews
-- ============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

CREATE POLICY "Users can view own reviews" ON reviews
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================
-- RLS for replies
-- ============================================
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own replies" ON replies;
DROP POLICY IF EXISTS "Users can insert own replies" ON replies;
DROP POLICY IF EXISTS "Users can update own replies" ON replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON replies;

CREATE POLICY "Users can view own replies" ON replies
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own replies" ON replies
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own replies" ON replies
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own replies" ON replies
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================
-- RLS for google_auth_tokens
-- ============================================
ALTER TABLE google_auth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tokens" ON google_auth_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON google_auth_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON google_auth_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON google_auth_tokens;

CREATE POLICY "Users can view own tokens" ON google_auth_tokens
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own tokens" ON google_auth_tokens
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own tokens" ON google_auth_tokens
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own tokens" ON google_auth_tokens
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================
-- RLS for oauth_states
-- ============================================
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own oauth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can insert own oauth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can delete own oauth states" ON oauth_states;

CREATE POLICY "Users can view own oauth states" ON oauth_states
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own oauth states" ON oauth_states
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can delete own oauth states" ON oauth_states
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================
-- RLS for google_business_accounts
-- ============================================
ALTER TABLE google_business_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own business accounts" ON google_business_accounts;
DROP POLICY IF EXISTS "Users can insert own business accounts" ON google_business_accounts;
DROP POLICY IF EXISTS "Users can update own business accounts" ON google_business_accounts;
DROP POLICY IF EXISTS "Users can delete own business accounts" ON google_business_accounts;

CREATE POLICY "Users can view own business accounts" ON google_business_accounts
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own business accounts" ON google_business_accounts
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own business accounts" ON google_business_accounts
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own business accounts" ON google_business_accounts
  FOR DELETE USING (tenant_id = auth.uid());
