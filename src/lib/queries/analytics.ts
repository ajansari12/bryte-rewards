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
