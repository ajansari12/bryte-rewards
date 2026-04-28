import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export type LeaderboardPeriod = 'week' | 'month' | 'quarter';

const PERIOD_DAYS: Record<LeaderboardPeriod, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  role: string;
  title: string;
  points: number;
  rank: number;
}

export function useLeaderboard(period: LeaderboardPeriod = 'month') {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.leaderboard(user?.org_id ?? '', period),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const days = PERIOD_DAYS[period];
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      // Sum points from recognitions received in the period
      const { data: recData, error: recErr } = await supabase
        .from('recognitions')
        .select('recipient_id, points')
        .eq('org_id', user.org_id)
        .gte('created_at', since);
      if (recErr) throw recErr;

      // Aggregate in JS
      const totals: Record<string, number> = {};
      for (const r of recData ?? []) {
        totals[r.recipient_id] = (totals[r.recipient_id] ?? 0) + r.points;
      }

      if (Object.keys(totals).length === 0) return [];

      // Fetch user profiles for those who appeared
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, display_name, role, title')
        .eq('org_id', user.org_id);
      if (uErr) throw uErr;

      const entries: LeaderboardEntry[] = (users ?? [])
        .map(u => ({
          user_id: u.id,
          display_name: u.display_name,
          role: u.role,
          title: u.title,
          points: totals[u.id] ?? 0,
          rank: 0,
        }))
        .filter(e => e.points > 0)
        .sort((a, b) => b.points - a.points)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      return entries;
    },
    enabled: !!user?.org_id,
    staleTime: 120_000,
  });
}
