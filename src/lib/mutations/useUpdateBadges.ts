import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

export interface BadgeDraft {
  id?: string;
  name: string;
  icon: string;
  category: string;
  criteria: string;
  is_seasonal: boolean;
}

interface UpdateBadgesInput {
  org_id: string;
  badges: BadgeDraft[];
  deletedIds?: string[];
}

export function useUpdateBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBadgesInput) => {
      if (input.deletedIds && input.deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from('badges')
          .delete()
          .in('id', input.deletedIds);
        if (delErr) throw delErr;
      }
      const rows = input.badges.map(b => ({
        ...(b.id ? { id: b.id } : {}),
        org_id: input.org_id,
        name: b.name,
        icon: b.icon,
        category: b.category,
        criteria: b.criteria,
        is_seasonal: b.is_seasonal,
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from('badges')
          .upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: qk.badges(input.org_id) });
      queryClient.invalidateQueries({ queryKey: ['badges', 'all', input.org_id] });
    },
  });
}
