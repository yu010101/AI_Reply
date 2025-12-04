-- 不足しているRLSポリシーを追加するマイグレーション
-- 実行日: 2025-01-27

-- ============================================
-- organizations テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 認証済みユーザーは組織を作成可能
CREATE POLICY IF NOT EXISTS "認証済みユーザーは組織を作成可能" ON organizations
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATEポリシー: 組織管理者は自分の組織を更新可能
CREATE POLICY IF NOT EXISTS "組織管理者は自分の組織を更新可能" ON organizations
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1  -- admin role (id = 1)
    )
  );

-- DELETEポリシー: 組織管理者は自分の組織を削除可能
CREATE POLICY IF NOT EXISTS "組織管理者は自分の組織を削除可能" ON organizations
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1  -- admin role
    )
  );

-- ============================================
-- organization_users テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者はユーザーを追加可能
CREATE POLICY IF NOT EXISTS "組織管理者はユーザーを追加可能" ON organization_users
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = NEW.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- UPDATEポリシー: 組織管理者はユーザー情報を更新可能
CREATE POLICY IF NOT EXISTS "組織管理者はユーザー情報を更新可能" ON organization_users
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role_id = 1  -- admin role
    )
  );

-- DELETEポリシー: 組織管理者はユーザーを削除可能
CREATE POLICY IF NOT EXISTS "組織管理者はユーザーを削除可能" ON organization_users
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
      AND ou.user_id = auth.uid()
      AND ou.role_id = 1  -- admin role
    )
  );

-- ============================================
-- subscriptions テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者はサブスクリプションを作成可能
CREATE POLICY IF NOT EXISTS "組織管理者はサブスクリプションを作成可能" ON subscriptions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = NEW.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- UPDATEポリシー: 組織管理者はサブスクリプションを更新可能
CREATE POLICY IF NOT EXISTS "組織管理者はサブスクリプションを更新可能" ON subscriptions
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = subscriptions.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- DELETEポリシー: 組織管理者はサブスクリプションを削除可能
CREATE POLICY IF NOT EXISTS "組織管理者はサブスクリプションを削除可能" ON subscriptions
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = subscriptions.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- ============================================
-- payment_history テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織の支払い履歴を表示可能
CREATE POLICY IF NOT EXISTS "ユーザーは自分の所属組織の支払い履歴を表示可能" ON payment_history
  FOR SELECT 
  USING (
    subscription_id IN (
      SELECT s.id FROM subscriptions s
      JOIN organization_users ou ON s.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- INSERTポリシー: サービスロールのみが支払い履歴を作成可能
CREATE POLICY IF NOT EXISTS "サービスロールは支払い履歴を作成可能" ON payment_history
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE/DELETEポリシー: 支払い履歴は更新・削除不可（監査ログのため）
-- 必要に応じてサービスロールのみに許可

-- ============================================
-- stripe_customers テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織のStripe顧客情報を表示可能
CREATE POLICY IF NOT EXISTS "ユーザーは自分の所属組織のStripe顧客情報を表示可能" ON stripe_customers
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERTポリシー: サービスロールのみがStripe顧客情報を作成可能
CREATE POLICY IF NOT EXISTS "サービスロールはStripe顧客情報を作成可能" ON stripe_customers
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- UPDATEポリシー: サービスロールのみがStripe顧客情報を更新可能
CREATE POLICY IF NOT EXISTS "サービスロールはStripe顧客情報を更新可能" ON stripe_customers
  FOR UPDATE 
  USING (auth.role() = 'service_role');

-- DELETEポリシー: サービスロールのみがStripe顧客情報を削除可能
CREATE POLICY IF NOT EXISTS "サービスロールはStripe顧客情報を削除可能" ON stripe_customers
  FOR DELETE 
  USING (auth.role() = 'service_role');

-- ============================================
-- invitations テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者は招待を作成可能
CREATE POLICY IF NOT EXISTS "組織管理者は招待を作成可能" ON invitations
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = NEW.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- UPDATEポリシー: 組織管理者は招待を更新可能
CREATE POLICY IF NOT EXISTS "組織管理者は招待を更新可能" ON invitations
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = invitations.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- DELETEポリシー: 組織管理者は招待を削除可能
CREATE POLICY IF NOT EXISTS "組織管理者は招待を削除可能" ON invitations
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = invitations.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- ============================================
-- usage_limits テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織の使用量制限を表示可能
CREATE POLICY IF NOT EXISTS "ユーザーは自分の所属組織の使用量制限を表示可能" ON usage_limits
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERTポリシー: サービスロールのみが使用量制限を作成可能
CREATE POLICY IF NOT EXISTS "サービスロールは使用量制限を作成可能" ON usage_limits
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- UPDATEポリシー: サービスロールのみが使用量制限を更新可能
CREATE POLICY IF NOT EXISTS "サービスロールは使用量制限を更新可能" ON usage_limits
  FOR UPDATE 
  USING (auth.role() = 'service_role');

-- DELETEポリシー: サービスロールのみが使用量制限を削除可能
CREATE POLICY IF NOT EXISTS "サービスロールは使用量制限を削除可能" ON usage_limits
  FOR DELETE 
  USING (auth.role() = 'service_role');

-- ============================================
-- event_logs テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織のイベントログを表示可能
CREATE POLICY IF NOT EXISTS "ユーザーは自分の所属組織のイベントログを表示可能" ON event_logs
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERTポリシー: サービスロールのみがイベントログを作成可能
CREATE POLICY IF NOT EXISTS "サービスロールはイベントログを作成可能" ON event_logs
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE/DELETEポリシー: イベントログは更新・削除不可（監査ログのため）

-- ============================================
-- google_auth_tokens テーブルのポリシー改善
-- ============================================

-- 本番環境では匿名ユーザーポリシーを削除（開発環境ではコメントアウト）
-- 本番環境でのみ実行: DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.google_auth_tokens;

-- より厳格なポリシーに変更（テナントIDによる制限）
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.google_auth_tokens;

CREATE POLICY IF NOT EXISTS "ユーザーは自分のトークンのみアクセス可能" ON public.google_auth_tokens
  FOR ALL 
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- サービスロールは引き続きフルアクセス可能（既存のポリシーを維持）

-- ============================================
-- oauth_states テーブルのポリシー改善
-- ============================================

-- 本番環境では匿名ユーザーポリシーを削除（開発環境ではコメントアウト）
-- 本番環境でのみ実行: DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.oauth_states;

-- より厳格なポリシーに変更（テナントIDによる制限）
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.oauth_states;

CREATE POLICY IF NOT EXISTS "ユーザーは自分のOAuth状態のみアクセス可能" ON public.oauth_states
  FOR ALL 
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- サービスロールは引き続きフルアクセス可能（既存のポリシーを維持）
