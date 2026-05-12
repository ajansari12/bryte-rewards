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
  avatar_url: string | null;
  points: number;
  recognition_count: number;
  rank: number;
}

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  points_sum: number | string;
  recognition_count: number | string;
}

export function useLeaderboard(period: LeaderboardPeriod = 'month') {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.leaderboard(user?.org_id ?? '', period),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const days = PERIOD_DAYS[period];
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const until = new Date(Date.now() + 60_000).toISOString();

      const { data, error } = await supabase.rpc('leaderboard_top', {
        p_org_id: user.org_id,
        p_since: since,
        p_until: until,
        p_limit: 50,
      });
      if (error) throw error;

      const rows = (data ?? []) as LeaderboardRow[];

      // Fetch titles separately (RPC doesn't return title to keep signature stable)
      const ids = rows.map(r => r.user_id);
      const titles: Record<string, string> = {};
      if (ids.length) {
        const { data: titleRows } = await supabase
          .from('users')
          .select('id, title')
          .in('id', ids);
        for (const t of titleRows ?? []) titles[t.id] = t.title ?? '';
      }

      return rows
        .map(r => ({
          user_id: r.user_id,
          display_name: r.display_name,
          role: r.role,
          title: titles[r.user_id] ?? '',
          avatar_url: r.avatar_url,
          points: Number(r.points_sum),
          recognition_count: Number(r.recognition_count),
          rank: 0,
        }))
        .filter(e => e.points > 0)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
    enabled: !!user?.org_id,
    staleTime: 120_000,
  });
}
