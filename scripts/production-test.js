/**
 * 本番環境総合テストスクリプト
 * 全機能を検証し、問題を特定・修正する
 */

const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjEwNTAyOCwiZXhwIjoyMDYxNjgxMDI4fQ.56IMZCLu92RLgdRB_ez5C1IQzCTdQlCadyYugKuR6B8';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDUwMjgsImV4cCI6MjA2MTY4MTAyOH0.qKlJ5aks3lutnssQHo39hGVeweACfrWs794k3FtVmGc';
const SUPABASE_URL = 'https://fmonerzmxohwkisdagvm.supabase.co';

const TEST_USER_EMAIL = 'demo@test-dental.com';
const TEST_USER_PASSWORD = 'Demo2024!';
const TEST_USER_ID = '7a4bf46a-d258-49d8-84db-f50a945bfcc9';

// Admin client (bypass RLS)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Anon client (for RLS testing)
const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const results = {
  passed: [],
  failed: [],
  fixed: []
};

function log(status, test, message) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚡';
  console.log(`${icon} [${status}] ${test}: ${message}`);
  if (status === 'PASS') results.passed.push(test);
  else if (status === 'FAIL') results.failed.push({ test, message });
  else if (status === 'FIXED') results.fixed.push(test);
}

async function testTableExists(table) {
  const { error } = await adminClient.from(table).select('*').limit(0);
  if (error) {
    log('FAIL', `Table ${table}`, error.message);
    return false;
  }
  log('PASS', `Table ${table}`, 'exists');
  return true;
}

async function testAuthentication() {
  console.log('\n=== 認証テスト ===');

  // サインイン
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (error) {
    log('FAIL', 'Sign In', error.message);
    return null;
  }

  log('PASS', 'Sign In', 'successful');
  return data.session;
}

async function testLocationsRLS(session) {
  console.log('\n=== locations RLSテスト ===');

  // 認証済みクライアント
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  // INSERT テスト
  const testLocation = {
    name: 'RLSテスト店舗',
    tenant_id: session.user.id,
    address: 'テスト住所',
    tone: 'polite'
  };

  const { data: inserted, error: insertError } = await authClient
    .from('locations')
    .insert(testLocation)
    .select();

  if (insertError) {
    log('FAIL', 'locations INSERT', insertError.message);
    return { insertError };
  }
  log('PASS', 'locations INSERT', 'successful');

  // SELECT テスト
  const { data: selected, error: selectError } = await authClient
    .from('locations')
    .select('*')
    .eq('tenant_id', session.user.id);

  if (selectError) {
    log('FAIL', 'locations SELECT', selectError.message);
  } else {
    log('PASS', 'locations SELECT', `found ${selected.length} rows`);
  }

  // UPDATE テスト
  if (inserted && inserted[0]) {
    const { error: updateError } = await authClient
      .from('locations')
      .update({ name: 'RLSテスト店舗（更新）' })
      .eq('id', inserted[0].id);

    if (updateError) {
      log('FAIL', 'locations UPDATE', updateError.message);
    } else {
      log('PASS', 'locations UPDATE', 'successful');
    }

    // DELETE テスト
    const { error: deleteError } = await authClient
      .from('locations')
      .delete()
      .eq('id', inserted[0].id);

    if (deleteError) {
      log('FAIL', 'locations DELETE', deleteError.message);
    } else {
      log('PASS', 'locations DELETE', 'successful');
    }
  }

  return { insertError, selectError };
}

async function testReviewsRLS(session) {
  console.log('\n=== reviews RLSテスト ===');

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  // まずlocationを作成
  const { data: location, error: locError } = await authClient
    .from('locations')
    .insert({ name: 'レビューテスト店舗', tenant_id: session.user.id, tone: 'polite' })
    .select()
    .single();

  if (locError) {
    log('FAIL', 'reviews test setup', `location作成失敗: ${locError.message}`);
    return;
  }

  // Review INSERT
  const { data: review, error: reviewError } = await authClient
    .from('reviews')
    .insert({
      location_id: location.id,
      tenant_id: session.user.id,
      author: 'テストユーザー',
      rating: 5,
      comment: 'テストレビュー',
      status: 'pending'
    })
    .select()
    .single();

  if (reviewError) {
    log('FAIL', 'reviews INSERT', reviewError.message);
  } else {
    log('PASS', 'reviews INSERT', 'successful');

    // クリーンアップ
    await authClient.from('reviews').delete().eq('id', review.id);
  }

  // クリーンアップ
  await authClient.from('locations').delete().eq('id', location.id);
}

async function testGoogleAuthTokens(session) {
  console.log('\n=== google_auth_tokens RLSテスト ===');

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  // SELECT テスト
  const { data, error } = await authClient
    .from('google_auth_tokens')
    .select('*')
    .eq('tenant_id', session.user.id);

  if (error) {
    log('FAIL', 'google_auth_tokens SELECT', error.message);
  } else {
    log('PASS', 'google_auth_tokens SELECT', `found ${data.length} rows`);
  }
}

async function checkRLSPolicies() {
  console.log('\n=== RLSポリシー確認 ===');

  // locationsのRLSポリシーを確認するSQLを実行
  const tables = ['locations', 'reviews', 'replies', 'google_auth_tokens', 'oauth_states'];

  for (const table of tables) {
    // RLSが有効か確認
    const { data: rlsEnabled } = await adminClient.rpc('check_rls_enabled', { table_name: table }).catch(() => ({ data: null }));
    console.log(`  ${table}: RLS check via RPC not available, will test directly`);
  }
}

async function generateRLSMigration() {
  console.log('\n=== RLSポリシー修正マイグレーション生成 ===');

  const migration = `
-- ============================================
-- Fix RLS Policies for all tables
-- Date: 2025-12-10
-- Purpose: Enable proper RLS for authenticated users
-- ============================================

-- Enable RLS on locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own locations" ON locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON locations;
DROP POLICY IF EXISTS "Users can update own locations" ON locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON locations;

-- Create policies for locations
CREATE POLICY "Users can view own locations" ON locations
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own locations" ON locations
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own locations" ON locations
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own locations" ON locations
  FOR DELETE USING (tenant_id = auth.uid());

-- Enable RLS on reviews
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

-- Enable RLS on replies (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'replies') THEN
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
  END IF;
END $$;

-- google_auth_tokens
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

-- oauth_states
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

-- google_business_accounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_business_accounts') THEN
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
  END IF;
END $$;
`;

  return migration;
}

async function main() {
  console.log('========================================');
  console.log('  本番環境総合テスト開始');
  console.log('========================================');

  // 1. テーブル存在確認
  console.log('\n=== テーブル存在確認 ===');
  const tables = ['locations', 'reviews', 'replies', 'google_auth_tokens', 'oauth_states', 'google_business_accounts'];
  for (const table of tables) {
    await testTableExists(table);
  }

  // 2. 認証テスト
  const session = await testAuthentication();
  if (!session) {
    console.log('\n認証失敗のため以降のテストをスキップ');
    return;
  }

  // 3. RLSテスト
  const locationsResult = await testLocationsRLS(session);

  // 4. RLSに問題があれば修正マイグレーションを出力
  if (locationsResult.insertError) {
    console.log('\n=== RLSポリシー修正が必要 ===');
    const migration = await generateRLSMigration();
    console.log('マイグレーションファイルを生成します...');

    // ファイル出力は呼び出し側で行う
    console.log('MIGRATION_NEEDED');
    console.log(migration);
  }

  // レポート
  console.log('\n========================================');
  console.log('  テスト結果サマリー');
  console.log('========================================');
  console.log(`PASS: ${results.passed.length}`);
  console.log(`FAIL: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  - ${f.test}: ${f.message}`));
}

main().catch(console.error);
