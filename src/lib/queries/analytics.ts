import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface WeeklyActivityEntry {
  label: string;
  given: number;
  received: number;
}

export interface ValueBreakdownEntry {
  name: string;
  pct: number;
  color: string;
}

const VALUE_COLORS = [
  'var(--b-terra)',
  'var(--b-forest)',
  'var(--b-gold)',
  '#D05A3B',
  'var(--b-ink-2)',
  'var(--b-gold-light)',
];

export function useWeeklyActivity() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.weeklyActivity(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const since = new Date(Date.now() - 84 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('recognitions')
        .select('sender_id, recipient_id, created_at')
        .eq('org_id', user.org_id)
        .gte('created_at', since);
      if (error) throw error;

      // Bucket into 12 ISO weeks
      const weeks: Record<string, { given: number; received: number }> = {};
      for (const r of data ?? []) {
        const d = new Date(r.created_at);
        const week = getISOWeekLabel(d);
        if (!weeks[week]) weeks[week] = { given: 0, received: 0 };
        if (r.sender_id === user.id) weeks[week].given++;
        if (r.recipient_id === user.id) weeks[week].received++;
      }

      // Generate last 12 week labels
      const labels: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.now() - i * 7 * 86_400_000);
        labels.push(getISOWeekLabel(d));
      }

      return labels.map((lbl, idx) => ({
        label: `W${idx + 1}`,
        given: weeks[lbl]?.given ?? 0,
        received: weeks[lbl]?.received ?? 0,
      })) as WeeklyActivityEntry[];
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}

function getISOWeekLabel(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface FeedStats {
  recognitionsThisMonth: number;
  recognitionsTrendPct: number;
  pointsGivenThisMonth: number;
  pointsTrendPct: number;
  participationPct: number;
  participationTrendPct: number;
}

export function useFeedStats() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.feedStats(user?.org_id ?? ''),
    queryFn: async (): Promise<FeedStats> => {
      const empty: FeedStats = {
        recognitionsThisMonth: 0, recognitionsTrendPct: 0,
        pointsGivenThisMonth: 0, pointsTrendPct: 0,
        participationPct: 0, participationTrendPct: 0,
      };
      if (!user?.org_id) return empty;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const { data: recs, error } = await supabase
        .from('recognitions')
        .select('sender_id, recipient_id, points, created_at')
        .eq('org_id', user.org_id)
        .gte('created_at', prevMonthStart.toISOString());
      if (error) throw error;

      const { count: orgUserCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', user.org_id);
      const totalUsers = orgUserCount ?? 0;

      const thisMonth = (recs ?? []).filter(r => new Date(r.created_at) >= thisMonthStart);
      const prevMonth = (recs ?? []).filter(r => new Date(r.created_at) < thisMonthStart);

      const pointsThis = thisMonth.reduce((s, r) => s + (r.points ?? 0), 0);
      const pointsPrev = prevMonth.reduce((s, r) => s + (r.points ?? 0), 0);

      const activeThis = new Set<string>();
      for (const r of thisMonth) {
        activeThis.add(r.sender_id);
        activeThis.add(r.recipient_id);
      }
      const activePrev = new Set<string>();
      for (const r of prevMonth) {
        activePrev.add(r.sender_id);
        activePrev.add(r.recipient_id);
      }

      const pct = (cur: number, prev: number) =>
        prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

      const participationThis = totalUsers > 0 ? Math.round((activeThis.size / totalUsers) * 100) : 0;
      const participationPrev = totalUsers > 0 ? Math.round((activePrev.size / totalUsers) * 100) : 0;

      return {
        recognitionsThisMonth: thisMonth.length,
        recognitionsTrendPct: pct(thisMonth.length, prevMonth.length),
        pointsGivenThisMonth: pointsThis,
        pointsTrendPct: pct(pointsThis, pointsPrev),
        participationPct: participationThis,
        participationTrendPct: participationThis - participationPrev,
      };
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}

export function useValueBreakdown() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.valueBreakdown(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('recognitions')
        .select('value_id, value:values(name)')
        .eq('org_id', user.org_id)
        .not('value_id', 'is', null);
      if (error) throw error;

      const counts: Record<string, { name: string; count: number }> = {};
      for (const r of data ?? []) {
        const v = r.value as any;
        if (!v?.name) continue;
        if (!counts[v.name]) counts[v.name] = { name: v.name, count: 0 };
        counts[v.name].count++;
      }

      const total = Object.values(counts).reduce((s, c) => s + c.count, 0);
      if (total === 0) return [];

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .map((c, i) => ({
          name: c.name,
          pct: Math.round((c.count / total) * 100),
          color: VALUE_COLORS[i % VALUE_COLORS.length],
        })) as ValueBreakdownEntry[];
    },
    enabled: !!user?.org_id,
    staleTime: 300_000,
  });
}
