import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbNotification {
  id: string;
  user_id: string;
  kind: string;
  payload_json: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.notifications(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DbNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}
