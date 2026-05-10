import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbBadge {
  id: string;
  org_id: string;
  name: string;
  icon: string;
  category: string;
  criteria: string;
  is_seasonal: boolean;
  awarded_at: string | null;
}

export interface DbBadgeAdmin {
  id: string;
  org_id: string;
  name: string;
  icon: string;
  category: string;
  criteria: string;
  is_seasonal: boolean;
}

export function useAllBadges() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ['badges', 'all', user?.org_id ?? ''] as const,
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('badges')
        .select('id, org_id, name, icon, category, criteria, is_seasonal')
        .eq('org_id', user.org_id)
        .order('category');
      if (error) throw error;
      return (data ?? []) as DbBadgeAdmin[];
    },
    enabled: !!user?.org_id && user.role === 'admin',
    staleTime: 60_000,
  });
}

export function useBadges() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.badges(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id || !user?.id) return [];
      // Fetch all org badges with a left join to user_badges for the current user
      const { data, error } = await supabase
        .from('badges')
        .select(`
          id, org_id, name, icon, category, criteria, is_seasonal,
          user_badges!left(awarded_at, user_id)
        `)
        .eq('org_id', user.org_id)
        .order('category');
      if (error) throw error;

      return (data ?? []).map(b => {
        const earned = (b.user_badges as any[]).find(
          (ub: { user_id: string; awarded_at: string }) => ub.user_id === user.id
        );
        return {
          id: b.id,
          org_id: b.org_id,
          name: b.name,
          icon: b.icon,
          category: b.category,
          criteria: b.criteria,
          is_seasonal: b.is_seasonal,
          awarded_at: earned?.awarded_at ?? null,
        } as DbBadge;
      });
    },
    enabled: !!user?.org_id && !!user?.id,
    staleTime: 300_000,
  });
}
