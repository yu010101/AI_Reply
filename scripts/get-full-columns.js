const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjEwNTAyOCwiZXhwIjoyMDYxNjgxMDI4fQ.56IMZCLu92RLgdRB_ez5C1IQzCTdQlCadyYugKuR6B8';
const SUPABASE_URL = 'https://fmonerzmxohwkisdagvm.supabase.co';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
  // まずlocationを作成
  const { data: loc } = await admin.from('locations').insert({
    name: 'test',
    tone: 'polite',
    tenant_id: '7a4bf46a-d258-49d8-84db-f50a945bfcc9'
  }).select();

  console.log('locations columns:', Object.keys(loc[0]));

  // reviewsをテスト（commentも含める）
  const { data: rev, error: revErr } = await admin.from('reviews').insert({
    location_id: loc[0].id,
    author: 'test',
    rating: 5,
    comment: 'test comment',
    status: 'pending'
  }).select();

  if (revErr) {
    console.log('reviews insert error:', revErr.message);
  } else {
    console.log('reviews columns:', Object.keys(rev[0]));
    await admin.from('reviews').delete().eq('id', rev[0].id);
  }

  await admin.from('locations').delete().eq('id', loc[0].id);
}

test();
