import { redirect } from 'react-router';
import { supabase } from '@/lib/supabase';

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect('/login');
  }
  return session;
}

export async function requireOnboardedSession() {
  const session = await requireSession();
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (!profile) throw redirect('/onboarding');
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarded_at')
    .eq('id', profile.org_id)
    .maybeSingle();
  if (!org?.onboarded_at) throw redirect('/onboarding');
  return session;
}

export async function redirectIfAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (!profile) throw redirect('/onboarding');
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarded_at')
    .eq('id', profile.org_id)
    .maybeSingle();
  throw redirect(org?.onboarded_at ? '/app/feed' : '/onboarding');
}

export async function requireSessionSkipIfOnboarded() {
  const session = await requireSession();
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (!profile) return session;
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarded_at')
    .eq('id', profile.org_id)
    .maybeSingle();
  if (org?.onboarded_at) throw redirect('/app/feed');
  return session;
}
