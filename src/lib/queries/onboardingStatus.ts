import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from './keys';
import { useCurrentOrg } from './users';

export interface OnboardingStatus {
  hasName: boolean;
  hasIndustry: boolean;
  valuesCount: number;
  badgesCount: number;
  rewardsCount: number;
  memberCount: number;
  invitesSkipped: boolean;
  onboardedAt: string | null;
  allReady: boolean;
}

export function useOnboardingStatus() {
  const { data: org } = useCurrentOrg();
  const orgId = org?.id ?? '';

  return useQuery({
    queryKey: qk.onboardingStatus(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<OnboardingStatus> => {
      const [values, badges, rewards, members] = await Promise.all([
        supabase.from('values').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('badges').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      ]);

      const hasName = !!(org?.name && org.name.trim());
      const hasIndustry = !!(org?.industry && org.industry.trim());
      const valuesCount = values.count ?? 0;
      const badgesCount = badges.count ?? 0;
      const rewardsCount = rewards.count ?? 0;
      const memberCount = members.count ?? 0;
      const invitesSkipped = !!org?.invites_skipped_at;
      const onboardedAt = org?.onboarded_at ?? null;

      const allReady =
        hasName &&
        hasIndustry &&
        valuesCount > 0 &&
        badgesCount > 0 &&
        rewardsCount > 0 &&
        (memberCount > 1 || invitesSkipped);

      return {
        hasName,
        hasIndustry,
        valuesCount,
        badgesCount,
        rewardsCount,
        memberCount,
        invitesSkipped,
        onboardedAt,
        allReady,
      };
    },
  });
}
