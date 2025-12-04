-- 不足しているRLSポリシーを追加するマイグレーション
-- 実行日: 2025-01-27

-- ============================================
-- organizations テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 認証済みユーザーは組織を作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' AND policyname = '認証済みユーザーは組織を作成可能'
  ) THEN
    CREATE POLICY "認証済みユーザーは組織を作成可能" ON organizations
      FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- UPDATEポリシー: 組織管理者は自分の組織を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' AND policyname = '組織管理者は自分の組織を更新可能'
  ) THEN
    CREATE POLICY "組織管理者は自分の組織を更新可能" ON organizations
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_users.organization_id = organizations.id
          AND organization_users.user_id = auth.uid()
          AND organization_users.role_id = 1  -- admin role (id = 1)
        )
      );
  END IF;
END $$;

-- DELETEポリシー: 組織管理者は自分の組織を削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' AND policyname = '組織管理者は自分の組織を削除可能'
  ) THEN
    CREATE POLICY "組織管理者は自分の組織を削除可能" ON organizations
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_users.organization_id = organizations.id
          AND organization_users.user_id = auth.uid()
          AND organization_users.role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- ============================================
-- organization_users テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者はユーザーを追加可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' AND policyname = '組織管理者はユーザーを追加可能'
  ) THEN
    CREATE POLICY "組織管理者はユーザーを追加可能" ON organization_users
      FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = NEW.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- UPDATEポリシー: 組織管理者はユーザー情報を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' AND policyname = '組織管理者はユーザー情報を更新可能'
  ) THEN
    CREATE POLICY "組織管理者はユーザー情報を更新可能" ON organization_users
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.organization_id = organization_users.organization_id
          AND ou.user_id = auth.uid()
          AND ou.role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- DELETEポリシー: 組織管理者はユーザーを削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_users' AND policyname = '組織管理者はユーザーを削除可能'
  ) THEN
    CREATE POLICY "組織管理者はユーザーを削除可能" ON organization_users
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.organization_id = organization_users.organization_id
          AND ou.user_id = auth.uid()
          AND ou.role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- ============================================
-- subscriptions テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者はサブスクリプションを作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = '組織管理者はサブスクリプションを作成可能'
  ) THEN
    CREATE POLICY "組織管理者はサブスクリプションを作成可能" ON subscriptions
      FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = NEW.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- UPDATEポリシー: 組織管理者はサブスクリプションを更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = '組織管理者はサブスクリプションを更新可能'
  ) THEN
    CREATE POLICY "組織管理者はサブスクリプションを更新可能" ON subscriptions
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = subscriptions.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- DELETEポリシー: 組織管理者はサブスクリプションを削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = '組織管理者はサブスクリプションを削除可能'
  ) THEN
    CREATE POLICY "組織管理者はサブスクリプションを削除可能" ON subscriptions
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = subscriptions.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- ============================================
-- payment_history テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織の支払い履歴を表示可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_history' AND policyname = 'ユーザーは自分の所属組織の支払い履歴を表示可能'
  ) THEN
    CREATE POLICY "ユーザーは自分の所属組織の支払い履歴を表示可能" ON payment_history
      FOR SELECT 
      USING (
        subscription_id IN (
          SELECT s.id FROM subscriptions s
          JOIN organization_users ou ON s.organization_id = ou.organization_id
          WHERE ou.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERTポリシー: サービスロールのみが支払い履歴を作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_history' AND policyname = 'サービスロールは支払い履歴を作成可能'
  ) THEN
    CREATE POLICY "サービスロールは支払い履歴を作成可能" ON payment_history
      FOR INSERT 
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- UPDATE/DELETEポリシー: 支払い履歴は更新・削除不可（監査ログのため）
-- 必要に応じてサービスロールのみに許可

-- ============================================
-- stripe_customers テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織のStripe顧客情報を表示可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' AND policyname = 'ユーザーは自分の所属組織のStripe顧客情報を表示可能'
  ) THEN
    CREATE POLICY "ユーザーは自分の所属組織のStripe顧客情報を表示可能" ON stripe_customers
      FOR SELECT 
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERTポリシー: サービスロールのみがStripe顧客情報を作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' AND policyname = 'サービスロールはStripe顧客情報を作成可能'
  ) THEN
    CREATE POLICY "サービスロールはStripe顧客情報を作成可能" ON stripe_customers
      FOR INSERT 
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- UPDATEポリシー: サービスロールのみがStripe顧客情報を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' AND policyname = 'サービスロールはStripe顧客情報を更新可能'
  ) THEN
    CREATE POLICY "サービスロールはStripe顧客情報を更新可能" ON stripe_customers
      FOR UPDATE 
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETEポリシー: サービスロールのみがStripe顧客情報を削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' AND policyname = 'サービスロールはStripe顧客情報を削除可能'
  ) THEN
    CREATE POLICY "サービスロールはStripe顧客情報を削除可能" ON stripe_customers
      FOR DELETE 
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- invitations テーブルのポリシー追加
-- ============================================

-- INSERTポリシー: 組織管理者は招待を作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' AND policyname = '組織管理者は招待を作成可能'
  ) THEN
    CREATE POLICY "組織管理者は招待を作成可能" ON invitations
      FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = NEW.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- UPDATEポリシー: 組織管理者は招待を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' AND policyname = '組織管理者は招待を更新可能'
  ) THEN
    CREATE POLICY "組織管理者は招待を更新可能" ON invitations
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = invitations.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- DELETEポリシー: 組織管理者は招待を削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' AND policyname = '組織管理者は招待を削除可能'
  ) THEN
    CREATE POLICY "組織管理者は招待を削除可能" ON invitations
      FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE organization_id = invitations.organization_id
          AND user_id = auth.uid()
          AND role_id = 1  -- admin role
        )
      );
  END IF;
END $$;

-- ============================================
-- usage_limits テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織の使用量制限を表示可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_limits' AND policyname = 'ユーザーは自分の所属組織の使用量制限を表示可能'
  ) THEN
    CREATE POLICY "ユーザーは自分の所属組織の使用量制限を表示可能" ON usage_limits
      FOR SELECT 
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERTポリシー: サービスロールのみが使用量制限を作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_limits' AND policyname = 'サービスロールは使用量制限を作成可能'
  ) THEN
    CREATE POLICY "サービスロールは使用量制限を作成可能" ON usage_limits
      FOR INSERT 
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- UPDATEポリシー: サービスロールのみが使用量制限を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_limits' AND policyname = 'サービスロールは使用量制限を更新可能'
  ) THEN
    CREATE POLICY "サービスロールは使用量制限を更新可能" ON usage_limits
      FOR UPDATE 
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- DELETEポリシー: サービスロールのみが使用量制限を削除可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_limits' AND policyname = 'サービスロールは使用量制限を削除可能'
  ) THEN
    CREATE POLICY "サービスロールは使用量制限を削除可能" ON usage_limits
      FOR DELETE 
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- event_logs テーブルのポリシー追加
-- ============================================

-- SELECTポリシー: ユーザーは自分の所属組織のイベントログを表示可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_logs' AND policyname = 'ユーザーは自分の所属組織のイベントログを表示可能'
  ) THEN
    CREATE POLICY "ユーザーは自分の所属組織のイベントログを表示可能" ON event_logs
      FOR SELECT 
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- INSERTポリシー: サービスロールのみがイベントログを作成可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_logs' AND policyname = 'サービスロールはイベントログを作成可能'
  ) THEN
    CREATE POLICY "サービスロールはイベントログを作成可能" ON event_logs
      FOR INSERT 
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- UPDATE/DELETEポリシー: イベントログは更新・削除不可（監査ログのため）

-- ============================================
-- google_auth_tokens テーブルのポリシー改善
-- ============================================

-- 本番環境では匿名ユーザーポリシーを削除（開発環境ではコメントアウト）
-- 本番環境でのみ実行: DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.google_auth_tokens;

-- より厳格なポリシーに変更（テナントIDによる制限）
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.google_auth_tokens;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'google_auth_tokens' AND schemaname = 'public' AND policyname = 'ユーザーは自分のトークンのみアクセス可能'
  ) THEN
    CREATE POLICY "ユーザーは自分のトークンのみアクセス可能" ON public.google_auth_tokens
      FOR ALL 
      USING (tenant_id = auth.uid())
      WITH CHECK (tenant_id = auth.uid());
  END IF;
END $$;

-- サービスロールは引き続きフルアクセス可能（既存のポリシーを維持）

-- ============================================
-- oauth_states テーブルのポリシー改善
-- ============================================

-- 本番環境では匿名ユーザーポリシーを削除（開発環境ではコメントアウト）
-- 本番環境でのみ実行: DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.oauth_states;

-- より厳格なポリシーに変更（テナントIDによる制限）
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.oauth_states;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'oauth_states' AND schemaname = 'public' AND policyname = 'ユーザーは自分のOAuth状態のみアクセス可能'
  ) THEN
    CREATE POLICY "ユーザーは自分のOAuth状態のみアクセス可能" ON public.oauth_states
      FOR ALL 
      USING (tenant_id = auth.uid())
      WITH CHECK (tenant_id = auth.uid());
  END IF;
END $$;

-- サービスロールは引き続きフルアクセス可能（既存のポリシーを維持）
