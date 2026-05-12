import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from './keys';

export interface NotificationPrefs {
  in_app: boolean;
  email_immediate: boolean;
  email_digest: boolean;
}

export interface DbUser {
  id: string;
  org_id: string;
  display_name: string;
  role: 'employee' | 'manager' | 'admin';
  title: string;
  avatar_url: string;
  points: number;
  manager_id: string | null;
  start_date: string | null;
  notification_prefs: NotificationPrefs;
}

export interface DbOrg {
  id: string;
  name: string;
  industry: string;
  plan: string;
  points_pool_remaining: number;
  quarterly_pool: number;
  billing_status: 'active' | 'past_due' | 'canceled' | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  renewal_date: string | null;
  payment_method_last4: string | null;
  onboarded_at: string | null;
  is_demo: boolean;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: qk.currentUser(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as DbUser | null;
    },
    staleTime: 60_000,
  });
}

export function useCurrentOrg() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.currentOrg(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.org_id)
        .maybeSingle();
      if (error) throw error;
      return data as DbOrg | null;
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}

export function useOrgUsers() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.orgUsers(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', user.org_id)
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as DbUser[];
    },
    enabled: !!user?.org_id,
    staleTime: 120_000,
  });
}

export function useDirectReports() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.directReports(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', user.id)
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as DbUser[];
    },
    enabled: !!user?.id,
    staleTime: 120_000,
  });
}
