import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbUser, NotificationPrefs } from '@/lib/queries/users';

interface UpdatePrefsInput {
  userId: string;
  prefs: NotificationPrefs;
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, prefs }: UpdatePrefsInput) => {
      const { error } = await supabase
        .from('users')
        .update({ notification_prefs: prefs })
        .eq('id', userId);
      if (error) throw error;
    },
    onMutate: async ({ prefs }) => {
      const key = qk.currentUser();
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbUser | null>(key);
      if (prev) {
        queryClient.setQueryData<DbUser | null>(key, { ...prev, notification_prefs: prefs });
      }
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.currentUser() });
    },
  });
}
