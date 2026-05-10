import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import { useCurrentUser } from '@/lib/queries/users';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface MonthlyVote {
  nominee_id: string;
  voter_id: string;
}

export function useMonthlyVotes() {
  const { data: user } = useCurrentUser();
  const period = currentPeriod();
  return useQuery({
    queryKey: qk.monthlyVotes(user?.org_id ?? '', period),
    queryFn: async () => {
      if (!user?.org_id) return [] as MonthlyVote[];
      const { data, error } = await supabase
        .from('teammate_of_month_votes')
        .select('nominee_id, voter_id')
        .eq('org_id', user.org_id)
        .eq('period', period);
      if (error) throw error;
      return (data ?? []) as MonthlyVote[];
    },
    enabled: !!user?.org_id,
    staleTime: 30_000,
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const period = currentPeriod();

  return useMutation({
    mutationFn: async (nomineeId: string) => {
      if (!user?.org_id || !user?.id) throw new Error('Not signed in');
      const { error } = await supabase
        .from('teammate_of_month_votes')
        .upsert(
          {
            org_id: user.org_id,
            voter_id: user.id,
            nominee_id: nomineeId,
            period,
          },
          { onConflict: 'org_id,voter_id,period' },
        );
      if (error) throw error;
    },
    onSettled: () => {
      if (user?.org_id) {
        queryClient.invalidateQueries({ queryKey: qk.monthlyVotes(user.org_id, period) });
      }
    },
  });
}
