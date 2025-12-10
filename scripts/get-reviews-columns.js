const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjEwNTAyOCwiZXhwIjoyMDYxNjgxMDI4fQ.56IMZCLu92RLgdRB_ez5C1IQzCTdQlCadyYugKuR6B8';
const SUPABASE_URL = 'https://fmonerzmxohwkisdagvm.supabase.co';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getReviewsColumns() {
  // 必須カラムだけ入れてみる
  const { data, error } = await admin.from('reviews').insert({
    location_id: '00000000-0000-0000-0000-000000000000',
    author: 'test',
    rating: 5,
    status: 'pending'
  }).select();

  if (error) {
    console.log('Insert error:', error.message);
    // foreign key violationでも構造は見える
    if (error.message.includes('foreign key')) {
      console.log('Foreign key constraint - need valid location_id');
    }
  } else {
    console.log('reviews columns:', Object.keys(data[0]));
    // cleanup
    await admin.from('reviews').delete().eq('author', 'test');
  }

  // locationsの構造も確認
  const { data: loc, error: locErr } = await admin.from('locations').insert({
    name: 'test',
    tone: 'polite'
  }).select();

  if (locErr) {
    console.log('locations insert error:', locErr.message);
  } else {
    console.log('locations columns:', Object.keys(loc[0]));

    // このlocation_idでreviewsをテスト
    const { data: rev, error: revErr } = await admin.from('reviews').insert({
      location_id: loc[0].id,
      author: 'test',
      rating: 5,
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
}

getReviewsColumns();
