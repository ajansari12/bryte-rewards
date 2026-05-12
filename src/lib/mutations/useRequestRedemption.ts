import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

interface RequestRedemptionInput {
  reward_id: string;
  user_id: string;
}

export function useRequestRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RequestRedemptionInput) => {
      // Uses the atomic RPC that deducts points + pool in one transaction
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_reward_id: input.reward_id,
        p_user_id: input.user_id,
      });
      if (error) throw error;
      return data as string; // redemption id
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: qk.redemptions(input.user_id) });
      queryClient.invalidateQueries({ queryKey: qk.currentUser() });
      queryClient.invalidateQueries({ queryKey: ['redemptions', 'org'] });
      queryClient.invalidateQueries({ queryKey: ['org'] });
    },
  });
}
