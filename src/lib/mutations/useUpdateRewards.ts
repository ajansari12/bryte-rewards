import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

export interface RewardDraft {
  id?: string;
  title: string;
  brand: string;
  denom: string;
  points: number;
  color: string;
  kind: string;
  active: boolean;
}

interface UpdateRewardsInput {
  org_id: string;
  rewards: RewardDraft[];
  deletedIds?: string[];
}

export function useUpdateRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRewardsInput) => {
      if (input.deletedIds && input.deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from('rewards')
          .update({ active: false })
          .in('id', input.deletedIds);
        if (delErr) throw delErr;
      }
      const rows = input.rewards.map(r => ({
        ...(r.id ? { id: r.id } : {}),
        org_id: input.org_id,
        title: r.title,
        brand: r.brand,
        denom: r.denom,
        points: r.points,
        color: r.color,
        kind: r.kind,
        active: r.active,
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from('rewards')
          .upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: qk.rewards(input.org_id) });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'all', input.org_id] });
    },
  });
}
