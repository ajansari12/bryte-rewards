import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentOrg } from './users';
import { qk } from './keys';

// Each point is treated as CA$1 for display purposes.
export const QUARTERLY_POOL = 24000;

function quarterStart(d = new Date()): string {
  const qMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), qMonth, 1).toISOString();
}

export function useQuarterlySpend() {
  const { data: org } = useCurrentOrg();
  return useQuery({
    queryKey: [...qk.currentOrg(org?.id ?? ''), 'quarterly-spend'],
    queryFn: async () => {
      if (!org?.id) return 0;
      const { data, error } = await supabase
        .from('recognitions')
        .select('points')
        .eq('org_id', org.id)
        .gte('created_at', quarterStart());
      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
    },
    enabled: !!org?.id,
    staleTime: 60_000,
  });
}
