import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbNomination {
  id: string;
  org_id: string;
  badge_id: string;
  nominator_id: string;
  nominee_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  badge?: { id: string; name: string; icon: string } | null;
  nominator?: { id: string; display_name: string } | null;
  nominee?: { id: string; display_name: string } | null;
}

export function useNominations() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.nominations(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('nominations')
        .select(`
          *,
          badge:badges(id, name, icon),
          nominator:users!nominations_nominator_id_fkey(id, display_name),
          nominee:users!nominations_nominee_id_fkey(id, display_name)
        `)
        .eq('org_id', user.org_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbNomination[];
    },
    enabled: !!user?.org_id,
    staleTime: 30_000,
  });
}

interface ReviewInput {
  nomination_id: string;
  status: 'approved' | 'rejected';
  nominee_id: string;
  badge_id: string;
}

export function useReviewNomination() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      if (!user?.org_id) throw new Error('No org');
      const { error: updateErr } = await supabase
        .from('nominations')
        .update({ status: input.status })
        .eq('id', input.nomination_id);
      if (updateErr) throw updateErr;

      if (input.status === 'approved') {
        const { error: awardErr } = await supabase
          .from('user_badges')
          .upsert(
            { user_id: input.nominee_id, badge_id: input.badge_id },
            { onConflict: 'user_id,badge_id' },
          );
        if (awardErr) throw awardErr;
      }
    },
    onSuccess: () => {
      if (user?.org_id) {
        queryClient.invalidateQueries({ queryKey: qk.nominations(user.org_id) });
        queryClient.invalidateQueries({ queryKey: qk.badges(user.org_id) });
        queryClient.invalidateQueries({ queryKey: qk.orgUsers(user.org_id) });
        queryClient.invalidateQueries({ queryKey: ['leaderboard', user.org_id] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });
}
