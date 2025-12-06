-- ============================================
-- Remove Anonymous User Policies Migration
-- Date: 2025-06-01
-- Purpose: Remove anonymous access from google_auth_tokens and oauth_states
-- ============================================

-- ============================================
-- GOOGLE_AUTH_TOKENS TABLE
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_auth_tokens' AND table_schema = 'public') THEN
    -- Drop anonymous user policies
    DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON google_auth_tokens;

    -- Drop overly permissive authenticated policy
    DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON google_auth_tokens;

    -- Drop existing tenant policy if it exists (to recreate properly)
    DROP POLICY IF EXISTS "ユーザーは自分のトークンのみアクセス可能" ON google_auth_tokens;
  END IF;
END $$;

-- Create proper tenant-based policy for google_auth_tokens
-- Users can only access their own tokens
CREATE POLICY "ユーザーは自分のトークンのみアクセス可能" ON google_auth_tokens
  FOR ALL
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- ============================================
-- OAUTH_STATES TABLE
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oauth_states' AND table_schema = 'public') THEN
    -- Drop anonymous user policies
    DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON oauth_states;

    -- Drop overly permissive authenticated policy
    DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON oauth_states;

    -- Drop existing tenant policy if it exists (to recreate properly)
    DROP POLICY IF EXISTS "ユーザーは自分のOAuth状態のみアクセス可能" ON oauth_states;
  END IF;
END $$;

-- Create proper tenant-based policy for oauth_states
-- Users can only access their own OAuth states
CREATE POLICY "ユーザーは自分のOAuth状態のみアクセス可能" ON oauth_states
  FOR ALL
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- ============================================
-- Verification Comments
-- ============================================

COMMENT ON POLICY "ユーザーは自分のトークンのみアクセス可能" ON google_auth_tokens IS
  'Production security: Users can only access their own OAuth tokens. Anonymous access removed.';

COMMENT ON POLICY "ユーザーは自分のOAuth状態のみアクセス可能" ON oauth_states IS
  'Production security: Users can only access their own OAuth states. Anonymous access removed.';
