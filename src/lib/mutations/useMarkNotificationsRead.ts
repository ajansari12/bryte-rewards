import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbNotification } from '@/lib/queries/notifications';

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onMutate: async (userId) => {
      const key = qk.notifications(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbNotification[]>(key);
      queryClient.setQueryData<DbNotification[]>(key, old =>
        (old ?? []).map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() })
      );
      return { prev, key };
    },
    onError: (_err, _userId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, userId) => {
      queryClient.invalidateQueries({ queryKey: qk.notifications(userId) });
    },
  });
}
