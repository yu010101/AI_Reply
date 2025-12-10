/**
 * 包括的本番環境テスト
 * 全機能を網羅的に検証
 */

const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjEwNTAyOCwiZXhwIjoyMDYxNjgxMDI4fQ.56IMZCLu92RLgdRB_ez5C1IQzCTdQlCadyYugKuR6B8';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDUwMjgsImV4cCI6MjA2MTY4MTAyOH0.qKlJ5aks3lutnssQHo39hGVeweACfrWs794k3FtVmGc';
const SUPABASE_URL = 'https://fmonerzmxohwkisdagvm.supabase.co';

const TEST_USER_EMAIL = 'demo@test-dental.com';
const TEST_USER_PASSWORD = 'Demo2024!';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const results = { passed: 0, failed: 0, tests: [] };

function log(status, test, message) {
  const icon = status === 'PASS' ? '✓' : '✗';
  console.log(`${icon} [${status}] ${test}: ${message}`);
  results.tests.push({ status, test, message });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

async function runTests() {
  console.log('========================================');
  console.log('  包括的本番環境テスト');
  console.log('========================================\n');

  // 1. 認証テスト
  console.log('--- 1. 認証テスト ---');
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (authError) {
    log('FAIL', '認証', authError.message);
    return;
  }
  log('PASS', '認証', 'ログイン成功');

  const session = authData.session;
  const userId = session.user.id;

  // 認証済みクライアント
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  // 2. locations CRUD
  console.log('\n--- 2. locations CRUD ---');

  const { data: loc, error: locErr } = await authClient.from('locations').insert({
    name: 'テスト歯科医院',
    tenant_id: userId,
    address: '東京都渋谷区1-1-1',
    tone: 'polite',
    google_place_id: 'ChIJtest123'
  }).select().single();

  if (locErr) {
    log('FAIL', 'locations INSERT', locErr.message);
  } else {
    log('PASS', 'locations INSERT', `id: ${loc.id.substring(0, 8)}...`);

    // SELECT
    const { data: locs } = await authClient.from('locations').select('*').eq('tenant_id', userId);
    log('PASS', 'locations SELECT', `${locs.length}件取得`);

    // UPDATE
    const { error: updateErr } = await authClient.from('locations').update({ name: 'テスト歯科医院（更新）' }).eq('id', loc.id);
    if (updateErr) log('FAIL', 'locations UPDATE', updateErr.message);
    else log('PASS', 'locations UPDATE', '更新成功');

    // 3. reviews CRUD
    console.log('\n--- 3. reviews CRUD ---');

    const { data: rev, error: revErr } = await authClient.from('reviews').insert({
      location_id: loc.id,
      tenant_id: userId,
      author: '山田太郎',
      rating: 5,
      comment: '素晴らしい治療でした！先生もスタッフも親切で安心できました。',
      status: 'pending'
    }).select().single();

    if (revErr) {
      log('FAIL', 'reviews INSERT', revErr.message);
    } else {
      log('PASS', 'reviews INSERT', `id: ${rev.id.substring(0, 8)}...`);

      // SELECT
      const { data: revs } = await authClient.from('reviews').select('*').eq('tenant_id', userId);
      log('PASS', 'reviews SELECT', `${revs.length}件取得`);

      // UPDATE
      const { error: revUpdateErr } = await authClient.from('reviews').update({ status: 'replied' }).eq('id', rev.id);
      if (revUpdateErr) log('FAIL', 'reviews UPDATE', revUpdateErr.message);
      else log('PASS', 'reviews UPDATE', '更新成功');

      // 4. replies CRUD
      console.log('\n--- 4. replies CRUD ---');

      const { data: reply, error: replyErr } = await authClient.from('replies').insert({
        review_id: rev.id,
        tenant_id: userId,
        content: 'ご来院いただきありがとうございます。今後ともよろしくお願いいたします。',
        status: 'draft'
      }).select().single();

      if (replyErr) {
        log('FAIL', 'replies INSERT', replyErr.message);
      } else {
        log('PASS', 'replies INSERT', `id: ${reply.id.substring(0, 8)}...`);

        // SELECT
        const { data: reps } = await authClient.from('replies').select('*').eq('tenant_id', userId);
        log('PASS', 'replies SELECT', `${reps.length}件取得`);

        // UPDATE
        const { error: repUpdateErr } = await authClient.from('replies').update({ status: 'published' }).eq('id', reply.id);
        if (repUpdateErr) log('FAIL', 'replies UPDATE', repUpdateErr.message);
        else log('PASS', 'replies UPDATE', '更新成功');

        // DELETE reply
        const { error: repDelErr } = await authClient.from('replies').delete().eq('id', reply.id);
        if (repDelErr) log('FAIL', 'replies DELETE', repDelErr.message);
        else log('PASS', 'replies DELETE', '削除成功');
      }

      // DELETE review
      const { error: revDelErr } = await authClient.from('reviews').delete().eq('id', rev.id);
      if (revDelErr) log('FAIL', 'reviews DELETE', revDelErr.message);
      else log('PASS', 'reviews DELETE', '削除成功');
    }

    // DELETE location
    const { error: locDelErr } = await authClient.from('locations').delete().eq('id', loc.id);
    if (locDelErr) log('FAIL', 'locations DELETE', locDelErr.message);
    else log('PASS', 'locations DELETE', '削除成功');
  }

  // 5. google_auth_tokens
  console.log('\n--- 5. google_auth_tokens CRUD ---');

  const { data: token, error: tokenErr } = await authClient.from('google_auth_tokens').insert({
    tenant_id: userId,
    access_token: 'test_access_token_123',
    refresh_token: 'test_refresh_token_456',
    expiry_date: new Date(Date.now() + 3600000).toISOString()
  }).select().single();

  if (tokenErr) {
    log('FAIL', 'google_auth_tokens INSERT', tokenErr.message);
  } else {
    log('PASS', 'google_auth_tokens INSERT', '作成成功');

    const { data: tokens } = await authClient.from('google_auth_tokens').select('*').eq('tenant_id', userId);
    log('PASS', 'google_auth_tokens SELECT', `${tokens.length}件取得`);

    const { error: tokenDelErr } = await authClient.from('google_auth_tokens').delete().eq('id', token.id);
    if (tokenDelErr) log('FAIL', 'google_auth_tokens DELETE', tokenDelErr.message);
    else log('PASS', 'google_auth_tokens DELETE', '削除成功');
  }

  // 6. oauth_states
  console.log('\n--- 6. oauth_states CRUD ---');

  const { data: state, error: stateErr } = await authClient.from('oauth_states').insert({
    tenant_id: userId,
    state: 'test_state_' + Date.now()
  }).select().single();

  if (stateErr) {
    log('FAIL', 'oauth_states INSERT', stateErr.message);
  } else {
    log('PASS', 'oauth_states INSERT', '作成成功');

    const { error: stateDelErr } = await authClient.from('oauth_states').delete().eq('id', state.id);
    if (stateDelErr) log('FAIL', 'oauth_states DELETE', stateDelErr.message);
    else log('PASS', 'oauth_states DELETE', '削除成功');
  }

  // 7. google_business_accounts
  console.log('\n--- 7. google_business_accounts CRUD ---');

  const { data: gba, error: gbaErr } = await authClient.from('google_business_accounts').insert({
    tenant_id: userId,
    account_id: 'test_account_123',
    account_name: 'テストアカウント',
    display_name: 'テスト歯科',
    type: 'LOCATION_GROUP'
  }).select().single();

  if (gbaErr) {
    log('FAIL', 'google_business_accounts INSERT', gbaErr.message);
  } else {
    log('PASS', 'google_business_accounts INSERT', '作成成功');

    const { data: gbas } = await authClient.from('google_business_accounts').select('*').eq('tenant_id', userId);
    log('PASS', 'google_business_accounts SELECT', `${gbas.length}件取得`);

    const { error: gbaDelErr } = await authClient.from('google_business_accounts').delete().eq('id', gba.id);
    if (gbaDelErr) log('FAIL', 'google_business_accounts DELETE', gbaDelErr.message);
    else log('PASS', 'google_business_accounts DELETE', '削除成功');
  }

  // 8. RLSセキュリティテスト（他ユーザーのデータにアクセスできないことを確認）
  console.log('\n--- 8. RLSセキュリティテスト ---');

  // adminで別ユーザーのデータを作成
  const { data: otherLoc } = await adminClient.from('locations').insert({
    name: '他ユーザーの店舗',
    tenant_id: '00000000-0000-0000-0000-000000000000',
    tone: 'polite'
  }).select().single();

  if (otherLoc) {
    // 認証済みユーザーがアクセスできないことを確認
    const { data: accessCheck } = await authClient.from('locations').select('*').eq('id', otherLoc.id);

    if (accessCheck && accessCheck.length === 0) {
      log('PASS', 'RLSセキュリティ', '他ユーザーのデータにアクセス不可');
    } else {
      log('FAIL', 'RLSセキュリティ', '他ユーザーのデータにアクセス可能（危険）');
    }

    // クリーンアップ
    await adminClient.from('locations').delete().eq('id', otherLoc.id);
  }

  // サマリー
  console.log('\n========================================');
  console.log('  テスト結果サマリー');
  console.log('========================================');
  console.log(`✓ PASS: ${results.passed}`);
  console.log(`✗ FAIL: ${results.failed}`);
  console.log(`合計: ${results.passed + results.failed}`);

  if (results.failed === 0) {
    console.log('\n🎉 全テスト通過！本番環境は正常に動作しています。');
  } else {
    console.log('\n⚠️ 失敗したテストがあります：');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.test}: ${t.message}`);
    });
  }
}

runTests().catch(console.error);
