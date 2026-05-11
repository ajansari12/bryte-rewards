import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

interface NominateBadgeInput {
  org_id: string;
  badge_id: string;
  nominee_id: string;
  reason: string;
}

export function useNominateBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NominateBadgeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase.from('nominations').insert({
        org_id: input.org_id,
        badge_id: input.badge_id,
        nominator_id: user.id,
        nominee_id: input.nominee_id,
        reason: input.reason,
      });
      if (error) throw error;
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: qk.badges(input.org_id) });
      queryClient.invalidateQueries({ queryKey: qk.nominations(input.org_id) });
    },
  });
}
