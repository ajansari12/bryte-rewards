import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbRedemption } from '@/lib/queries/rewards';

interface ApproveRedemptionInput {
  redemption_id: string;
  status: 'approved' | 'cancelled';
  org_id: string;
  processed_by: string;
}

export function useApproveRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApproveRedemptionInput) => {
      const { error } = await supabase
        .from('redemptions')
        .update({
          status: input.status,
          processed_by: input.processed_by,
          processed_at: new Date().toISOString(),
        })
        .eq('id', input.redemption_id);
      if (error) throw error;
    },
    onMutate: async (input) => {
      const key = qk.orgRedemptions(input.org_id);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbRedemption[]>(key);
      queryClient.setQueryData<DbRedemption[]>(key, old =>
        (old ?? []).map(r =>
          r.id === input.redemption_id
            ? { ...r, status: input.status, processed_by: input.processed_by, processed_at: new Date().toISOString() }
            : r
        )
      );
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: qk.orgRedemptions(input.org_id) });
      queryClient.invalidateQueries({ queryKey: qk.currentOrg(input.org_id) });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
