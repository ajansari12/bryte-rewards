import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbReward {
  id: string;
  org_id: string;
  title: string;
  brand: string;
  denom: string;
  points: number;
  color: string;
  kind: string;
  active: boolean;
}

export interface DbRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  reward: { title: string; brand: string; points: number } | null;
  user: { display_name: string } | null;
}

export function useRewards() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.rewards(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('active', true)
        .order('points');
      if (error) throw error;
      return (data ?? []) as DbReward[];
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}

export function useAllRewards() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ['rewards', 'all', user?.org_id ?? ''] as const,
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('org_id', user.org_id)
        .order('points');
      if (error) throw error;
      return (data ?? []) as DbReward[];
    },
    enabled: !!user?.org_id && user.role === 'admin',
    staleTime: 60_000,
  });
}

export function useMyRedemptions() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.redemptions(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, reward:rewards(title, brand, points)')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbRedemption[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useOrgRedemptions() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.orgRedemptions(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      // RLS: managers/admins can read all org redemptions
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, reward:rewards(title, brand, points), user:users!user_id(display_name)')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbRedemption[];
    },
    enabled: !!user?.org_id && (user.role === 'manager' || user.role === 'admin'),
    staleTime: 60_000,
  });
}
