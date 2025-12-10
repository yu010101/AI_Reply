const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjEwNTAyOCwiZXhwIjoyMDYxNjgxMDI4fQ.56IMZCLu92RLgdRB_ez5C1IQzCTdQlCadyYugKuR6B8';
const SUPABASE_URL = 'https://fmonerzmxohwkisdagvm.supabase.co';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkColumns() {
  const tables = ['locations', 'reviews', 'google_auth_tokens', 'oauth_states', 'google_business_accounts'];

  for (const table of tables) {
    // Insert dummy row to get columns
    const { data, error } = await admin.from(table).select('*').limit(1);

    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
      continue;
    }

    if (data && data.length > 0) {
      console.log(`${table}: ${Object.keys(data[0]).join(', ')}`);
    } else {
      // Try insert with minimal data to see what columns exist
      const testInsert = await admin.from(table).insert({}).select();
      if (testInsert.error) {
        // Parse error to get column info
        console.log(`${table}: (empty) - ${testInsert.error.message.substring(0, 100)}`);
      }
    }
  }
}

checkColumns();
