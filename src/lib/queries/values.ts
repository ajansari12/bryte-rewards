import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbValue {
  id: string;
  org_id: string;
  name: string;
  icon: string;
  points: number;
  sort_order: number;
}

export function useOrgValues() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.orgValues(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('values')
        .select('*')
        .eq('org_id', user.org_id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as DbValue[];
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}
