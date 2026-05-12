import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentOrg } from './users';

export interface DbIntegration {
  org_id: string;
  kind: string;
  connected_at: string;
  config_json: Record<string, unknown>;
}

export const INTEGRATION_CATALOG = [
  { kind: 'workday', name: 'Workday', color: '#F14E1C', desc: 'Auto-import your org chart and sync new hires.' },
  { kind: 'adp', name: 'ADP', color: '#E31837', desc: 'Sync payroll data, employee records and org hierarchy.' },
  { kind: 'hris', name: 'HRIS Sync', color: '#2C5F4A', desc: 'Generic SCIM bridge for BambooHR, Rippling, and more.' },
  { kind: 'zapier', name: 'Zapier', color: '#FF4A00', desc: 'Connect to 5,000+ apps. Trigger recognitions from any workflow.' },
];

const keyFor = (orgId: string) => ['integrations', orgId];

export function useIntegrations() {
  const { data: org } = useCurrentOrg();
  return useQuery({
    queryKey: keyFor(org?.id ?? ''),
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('org_id', org.id);
      if (error) throw error;
      return (data ?? []) as DbIntegration[];
    },
    enabled: !!org?.id,
    staleTime: 60_000,
  });
}

export function useToggleIntegration() {
  const { data: org } = useCurrentOrg();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: string; connect: boolean }) => {
      if (!org?.id) throw new Error('No org');
      if (input.connect) {
        const { error } = await supabase
          .from('integrations')
          .upsert({ org_id: org.id, kind: input.kind, config_json: {} });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('integrations')
          .delete()
          .eq('org_id', org.id)
          .eq('kind', input.kind);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (org?.id) queryClient.invalidateQueries({ queryKey: keyFor(org.id) });
    },
  });
}
