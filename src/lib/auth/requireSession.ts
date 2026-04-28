import { redirect } from 'react-router';
import { supabase } from '@/lib/supabase';

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect('/login');
  }
  return session;
}
