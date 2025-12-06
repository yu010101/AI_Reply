-- ============================================
-- Base Tables Migration
-- Date: 2025-01-01
-- Purpose: Create core tables for AI Reply application
-- ============================================

-- Use gen_random_uuid() which is available by default in PostgreSQL 13+
-- Or use extensions.uuid_generate_v4() if uuid-ossp is installed in extensions schema

-- ============================================
-- Organizations (Tenants) Table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles if not exist
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', '組織の管理者。すべての機能にアクセス可能', '{"all": true}'),
(2, 'manager', 'プロジェクト管理者。設定変更とレビュー管理が可能', '{"reviews": {"read": true, "write": true}, "settings": {"read": true, "write": true}, "analytics": {"read": true}}'),
(3, 'staff', '一般スタッフ。レビュー対応のみ可能', '{"reviews": {"read": true, "write": true}}'),
(4, 'viewer', '閲覧のみ可能なユーザー', '{"reviews": {"read": true}, "analytics": {"read": true}}')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id) FROM roles), 1));

-- ============================================
-- Organization Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- Subscription Plans Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL,
  annual_price INTEGER NOT NULL,
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans if not exist
INSERT INTO subscription_plans (id, name, description, monthly_price, annual_price, features, limits, is_active) VALUES
(1, 'Free', '基本機能が利用可能な無料プラン', 0, 0,
 '{"basic_analytics": true, "review_management": true}',
 '{"users": 1, "locations": 1, "api_calls_per_day": 100}',
 true),
(2, 'Starter', '小規模事業者向けスタータープラン', 5000, 50000,
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true}',
 '{"users": 3, "locations": 3, "api_calls_per_day": 500}',
 true),
(3, 'Business', '中規模事業者向けビジネスプラン', 15000, 150000,
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true, "advanced_analytics": true, "multi_platform": true}',
 '{"users": 10, "locations": 10, "api_calls_per_day": 2000}',
 true),
(4, 'Enterprise', '大規模事業者向けエンタープライズプラン', 50000, 500000,
 '{"basic_analytics": true, "review_management": true, "ai_suggestions": true, "advanced_analytics": true, "multi_platform": true, "api_access": true, "priority_support": true}',
 '{"users": -1, "locations": -1, "api_calls_per_day": 10000}',
 true)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('subscription_plans_id_seq', COALESCE((SELECT MAX(id) FROM subscription_plans), 1));

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================
-- Payment History Table
-- ============================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
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

-- ============================================
-- Stripe Customers Table
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ============================================
-- Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================
-- Usage Limits Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  limit_value INTEGER NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, resource_type)
);

-- ============================================
-- Event Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Basic RLS Policies
-- ============================================

-- Organizations: Users can view their own organizations
CREATE POLICY "組織管理者は自分の組織を表示可能" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
    )
  );

-- Organization Users: Users can view members of their organizations
CREATE POLICY "ユーザーは自分の所属組織のユーザー一覧を表示可能" ON organization_users
  FOR SELECT USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- Subscriptions: Users can view their organization's subscription
CREATE POLICY "ユーザーは自分の所属組織のサブスクリプションを表示可能" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- Invitations: Users can view invitations for their organizations
CREATE POLICY "ユーザーは自分の所属組織の招待を表示可能" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_org_id ON event_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
