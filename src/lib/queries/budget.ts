import { useCurrentOrg } from './users';

export function useQuarterlySpend() {
  const { data: org, isLoading, error } = useCurrentOrg();
  if (!org) {
    return { data: 0, isLoading, error, hasOrg: false };
  }
  const pool = org.quarterly_pool ?? 0;
  const remaining = org.points_pool_remaining ?? pool;
  const spent = Math.max(0, pool - remaining);
  return { data: spent, isLoading, error, hasOrg: true };
}

export function useQuarterlyPool(): number {
  const { data: org } = useCurrentOrg();
  return org?.quarterly_pool ?? 0;
}
