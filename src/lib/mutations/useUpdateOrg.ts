import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

export interface UpdateOrgInput {
  org_id: string;
  name?: string;
  industry?: string;
  invites_skipped_at?: string | null;
}

export function useUpdateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateOrgInput) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.industry !== undefined) patch.industry = input.industry;
      if (input.invites_skipped_at !== undefined) patch.invites_skipped_at = input.invites_skipped_at;
      if (patch.name === '') throw new Error('Organisation name cannot be empty');
      if (patch.industry === '') throw new Error('Industry required');

      const { error } = await supabase.from('organizations').update(patch).eq('id', input.org_id);
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: qk.currentOrg(input.org_id) });
      queryClient.invalidateQueries({ queryKey: qk.onboardingStatus(input.org_id) });
    },
  });
}

export function useFinalizeOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.rpc('finalize_onboarding', { p_org_id: orgId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, orgId) => {
      queryClient.invalidateQueries({ queryKey: qk.currentOrg(orgId) });
      queryClient.invalidateQueries({ queryKey: qk.onboardingStatus(orgId) });
    },
  });
}
