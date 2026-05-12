import { useCurrentOrg } from './users';

export function useQuarterlySpend() {
  const { data: org } = useCurrentOrg();
  const pool = org?.quarterly_pool ?? 24000;
  const remaining = org?.points_pool_remaining ?? pool;
  const spent = Math.max(0, pool - remaining);
  return { data: spent, isLoading: !org };
}

export function useQuarterlyPool(): number {
  const { data: org } = useCurrentOrg();
  return org?.quarterly_pool ?? 24000;
}
