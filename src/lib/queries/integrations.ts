import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbIntegration {
  org_id: string;
  kind: string;
  connected_at: string;
  config_json: Record<string, unknown>;
}

export function useIntegrations() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.integrations(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('org_id', user.org_id);
      if (error) throw error;
      return (data ?? []) as DbIntegration[];
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}
