-- AI Reply サブスクリプション管理とユーザー/テナント管理のためのデータベーススキーマ

-- 組織（テナント）テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーロールテーブル
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 事前定義ロールのデータ
INSERT INTO roles (name, description, permissions) VALUES
('admin', '組織の管理者。すべての機能にアクセス可能', '{"all": true}'),
('manager', 'プロジェクト管理者。設定変更とレビュー管理が可能', '{"reviews": {"read": true, "write": true}, "settings": {"read": true, "write": true}, "analytics": {"read": true}}'),
('staff', '一般スタッフ。レビュー対応のみ可能', '{"reviews": {"read": true, "write": true}}'),
('viewer', '閲覧のみ可能なユーザー', '{"reviews": {"read": true}, "analytics": {"read": true}}');

-- 組織ユーザーテーブル
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- サブスクリプションプランテーブル
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL, -- 月額料金（円）
  annual_price INTEGER NOT NULL, -- 年額料金（円）
  features JSONB NOT NULL, -- 含まれる機能
  limits JSONB NOT NULL, -- 上限値（ユーザー数、店舗数など）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 事前定義プランのデータ
INSERT INTO subscription_plans (name, description, monthly_price, annual_price, features, limits, is_active) VALUES
('Free', '基本機能が利用可能な無料プラン', 0, 0, 
 '{"basic_analytics": true, "review_management": true}', 
 '{"users": 1, "locations": 1, "api_calls_per_day": 100}', 
 true),
('Starter', '小規模事業者向けスタータープラン', 5000, 50000, 
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true}', 
 '{"users": 3, "locations": 3, "api_calls_per_day": 500}', 
 true),
('Business', '中規模事業者向けビジネスプラン', 15000, 150000, 
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true, "advanced_analytics": true, "multi_platform": true}', 
 '{"users": 10, "locations": 10, "api_calls_per_day": 2000}', 
 true),
('Enterprise', '大規模事業者向けエンタープライズプラン', 50000, 500000, 
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true, "advanced_analytics": true, "multi_platform": true, "api_access": true, "priority_support": true}', 
 '{"users": -1, "locations": -1, "api_calls_per_day": 10000}', 
 true);

-- サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paypal', NULL)),
  payment_provider_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支払い履歴テーブル
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 金額（円）
  currency TEXT NOT NULL DEFAULT 'jpy',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  invoice_url TEXT,
  receipt_url TEXT,
  payment_provider_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripeカスタマーテーブル（Stripe連携用）
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 招待テーブル（組織への招待管理）
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用量制限追跡テーブル
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'api_calls', 'storage', etc.
  limit_value INTEGER NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, resource_type)
);

-- イベントログテーブル（課金・使用状況関連）
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS（行レベルセキュリティ）ポリシーの設定
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- 組織管理者ポリシー
CREATE POLICY "組織管理者は自分の組織を表示可能" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
    )
  );

-- 組織ユーザーポリシー
CREATE POLICY "ユーザーは自分の所属組織のユーザー一覧を表示可能" ON organization_users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- サブスクリプションポリシー
CREATE POLICY "ユーザーは自分の所属組織のサブスクリプションを表示可能" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- ロールベースのトリガー関数
CREATE OR REPLACE FUNCTION check_user_permission() 
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_users
    JOIN roles ON organization_users.role_id = roles.id
    WHERE organization_users.user_id = auth.uid()
    AND organization_users.organization_id = NEW.organization_id
    AND (roles.name = 'admin' OR roles.permissions->>'all' = 'true')
  ) THEN
    RAISE EXCEPTION 'この操作を実行する権限がありません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 組織管理のためのトリガー
CREATE TRIGGER check_org_admin_permission
BEFORE INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE FUNCTION check_user_permission(); 