-- ============================================
-- Improved RLS Policies Migration
-- Date: 2025-06-01
-- Purpose: Enhance security for organizations, organization_users, and subscriptions tables
-- ============================================

-- Check if tables exist before applying policies
DO $$
BEGIN
  -- Only proceed if the organizations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN

    -- ============================================
    -- ORGANIZATIONS TABLE - Improved Policies
    -- ============================================

    -- Drop existing potentially insecure policies
    DROP POLICY IF EXISTS "認証済みユーザーは組織を作成可能" ON organizations;
    DROP POLICY IF EXISTS "組織管理者は自分の組織を更新可能" ON organizations;
    DROP POLICY IF EXISTS "組織管理者は自分の組織を削除可能" ON organizations;
    DROP POLICY IF EXISTS "組織管理者は自分の組織を表示可能" ON organizations;
    DROP POLICY IF EXISTS "org_select_policy" ON organizations;
    DROP POLICY IF EXISTS "org_insert_policy" ON organizations;
    DROP POLICY IF EXISTS "org_update_policy" ON organizations;
    DROP POLICY IF EXISTS "org_delete_policy" ON organizations;

  END IF;
END $$;

-- SELECT: Users can view organizations they belong to
CREATE POLICY "org_select_policy" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
    )
  );

-- INSERT: Only authenticated users can create organizations
CREATE POLICY "org_insert_policy" ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Only organization admins (role_id = 1) can update their organization
CREATE POLICY "org_update_policy" ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  );

-- DELETE: Only organization admins can delete their organization
CREATE POLICY "org_delete_policy" ON organizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  );

-- ============================================
-- ORGANIZATION_USERS TABLE - Improved Policies
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_users' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "組織管理者はユーザーを追加可能" ON organization_users;
    DROP POLICY IF EXISTS "組織管理者はユーザー情報を更新可能" ON organization_users;
    DROP POLICY IF EXISTS "組織管理者はユーザーを削除可能" ON organization_users;
    DROP POLICY IF EXISTS "ユーザーは自分の所属組織のユーザー一覧を表示可能" ON organization_users;
    DROP POLICY IF EXISTS "org_users_select_policy" ON organization_users;
    DROP POLICY IF EXISTS "org_users_insert_policy" ON organization_users;
    DROP POLICY IF EXISTS "org_users_update_policy" ON organization_users;
    DROP POLICY IF EXISTS "org_users_delete_policy" ON organization_users;
  END IF;
END $$;

-- SELECT: Users can view other users in their organizations
CREATE POLICY "org_users_select_policy" ON organization_users
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- INSERT: Admins can add users OR users can add themselves to new organizations
CREATE POLICY "org_users_insert_policy" ON organization_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role_id = 1
    )
  );

-- UPDATE: Only admins can update user roles/status
CREATE POLICY "org_users_update_policy" ON organization_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role_id = 1
    )
  )
  WITH CHECK (
    (user_id != auth.uid()) AND
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role_id = 1
    )
  );

-- DELETE: Admins can remove users OR users can remove themselves
CREATE POLICY "org_users_delete_policy" ON organization_users
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      user_id != auth.uid() AND
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role_id = 1
      )
    )
  );

-- ============================================
-- SUBSCRIPTIONS TABLE - Improved Policies
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "組織管理者はサブスクリプションを作成可能" ON subscriptions;
    DROP POLICY IF EXISTS "組織管理者はサブスクリプションを更新可能" ON subscriptions;
    DROP POLICY IF EXISTS "組織管理者はサブスクリプションを削除可能" ON subscriptions;
    DROP POLICY IF EXISTS "ユーザーは自分の所属組織のサブスクリプションを表示可能" ON subscriptions;
    DROP POLICY IF EXISTS "subscription_select_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscription_insert_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscription_update_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscription_delete_policy" ON subscriptions;
  END IF;
END $$;

-- SELECT: All organization members can view their organization's subscription
CREATE POLICY "subscription_select_policy" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- INSERT: Only admins can create subscriptions for their organization
CREATE POLICY "subscription_insert_policy" ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = subscriptions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  );

-- UPDATE: Only admins can update subscriptions
CREATE POLICY "subscription_update_policy" ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = subscriptions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = subscriptions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  );

-- DELETE: Only admins can delete subscriptions
CREATE POLICY "subscription_delete_policy" ON subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = subscriptions.organization_id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1
    )
  );

-- ============================================
-- Additional Security Improvements
-- ============================================

-- Create function to prevent last admin from being removed
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF OLD.role_id = 1 THEN
    SELECT COUNT(*) INTO admin_count
    FROM organization_users
    WHERE organization_id = OLD.organization_id
    AND role_id = 1
    AND id != OLD.id;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from an organization';
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent last admin removal
DROP TRIGGER IF EXISTS prevent_last_admin_removal_trigger ON organization_users;
CREATE TRIGGER prevent_last_admin_removal_trigger
  BEFORE DELETE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_removal();

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_users_org_id_user_id
  ON organization_users(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_org_users_user_id
  ON organization_users(user_id);

CREATE INDEX IF NOT EXISTS idx_org_users_org_id_role_id
  ON organization_users(organization_id, role_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id
  ON subscriptions(organization_id);
