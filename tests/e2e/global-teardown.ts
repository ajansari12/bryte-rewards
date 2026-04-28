import { createClient } from '@supabase/supabase-js';
import { TEST_USERS, TEST_ORG_NAME } from './global-setup';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function teardown() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete test auth users
  const { data: existing } = await supabase.auth.admin.listUsers();
  const testEmails = new Set(Object.values(TEST_USERS).map(u => u.email));
  for (const au of existing?.users ?? []) {
    if (au.email && testEmails.has(au.email)) {
      await supabase.auth.admin.deleteUser(au.id);
    }
  }

  // Delete org (cascades to users, rewards, etc.)
  await supabase.from('organizations').delete().eq('name', TEST_ORG_NAME);

  console.log('[global-teardown] Test data cleaned up');
}

export default teardown;
