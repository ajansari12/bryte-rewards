import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const TEST_USERS = {
  sender: {
    email: 'e2e-sender@bryte-test.invalid',
    password: 'E2eTest123!',
    displayName: 'E2E Sender',
  },
  recipient: {
    email: 'e2e-recipient@bryte-test.invalid',
    password: 'E2eTest123!',
    displayName: 'E2E Recipient',
  },
  admin: {
    email: 'e2e-admin@bryte-test.invalid',
    password: 'E2eTest123!',
    displayName: 'E2E Admin',
  },
};

export const TEST_ORG_NAME = 'E2E Test Org';

async function setup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn('[global-setup] Skipping seed: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Remove any stale test users from previous runs
  for (const u of Object.values(TEST_USERS)) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users.find(au => au.email === u.email);
    if (found) await supabase.auth.admin.deleteUser(found.id);
  }

  // Clean up stale org
  await supabase.from('organizations').delete().eq('name', TEST_ORG_NAME);

  // Create org
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: TEST_ORG_NAME, industry: 'healthcare', plan: 'growth' })
    .select('id')
    .single();
  if (orgErr) throw orgErr;
  const orgId: string = org.id;

  // Create auth users and profile rows
  const roles: Record<string, string> = {
    sender: 'employee',
    recipient: 'employee',
    admin: 'admin',
  };

  for (const [key, u] of Object.entries(TEST_USERS)) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (authErr) throw authErr;

    const { error: profileErr } = await supabase.from('users').insert({
      id: authUser.user.id,
      org_id: orgId,
      display_name: u.displayName,
      role: roles[key],
      points: key === 'recipient' ? 5000 : 0,
    });
    if (profileErr) throw profileErr;
  }

  // Create a reward for the recipient to redeem
  await supabase.from('rewards').insert({
    org_id: orgId,
    title: 'E2E Gift Card',
    brand: 'Test Brand',
    denom: '$25',
    points: 500,
    color: '#1A1A1A',
    kind: 'giftcard',
    active: true,
  });

  // Create a value for recognition
  await supabase.from('values').insert({
    org_id: orgId,
    name: 'Innovation',
    icon: '💡',
    points: 50,
    sort_order: 0,
  });

  process.env.E2E_ORG_ID = orgId;
  console.log('[global-setup] Test org seeded:', orgId);
}

export default setup;
