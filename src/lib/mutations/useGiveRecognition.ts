import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbRecognition } from '@/lib/queries/recognitions';

interface GiveRecognitionInput {
  org_id: string;
  sender_id: string;
  recipient_id: string;
  value_id: string | null;
  message: string;
  points: number;
  type: 'public' | 'private' | 'milestone' | 'spotlight';
  // For optimistic display only
  _senderName: string;
  _senderRole: string;
  _recipientName: string;
  _valueName: string | null;
  _valueIcon: string | null;
}

export function useGiveRecognition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GiveRecognitionInput) => {
      const { data, error } = await supabase
        .from('recognitions')
        .insert({
          org_id: input.org_id,
          sender_id: input.sender_id,
          recipient_id: input.recipient_id,
          value_id: input.value_id,
          message: input.message,
          points: input.points,
          type: input.type,
        })
        .select(`
          id, org_id, sender_id, recipient_id, value_id, message, points, type, created_at,
          sender:users!sender_id(display_name, role),
          recipient:users!recipient_id(display_name, role),
          value:values(name, icon, points),
          reactions(recognition_id, user_id, emoji)
        `)
        .single();
      if (error) throw error;
      return data as unknown as DbRecognition;
    },
    onMutate: async (input) => {
      const key = qk.recognitions(input.org_id);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbRecognition[]>(key);

      const optimistic: DbRecognition = {
        id: `optimistic-${Date.now()}`,
        org_id: input.org_id,
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        value_id: input.value_id,
        message: input.message,
        points: input.points,
        type: input.type,
        created_at: new Date().toISOString(),
        sender: { display_name: input._senderName, role: input._senderRole },
        recipient: { display_name: input._recipientName, role: 'employee' },
        value: input._valueName ? { name: input._valueName, icon: input._valueIcon ?? '✦', points: input.points } : null,
        reactions: [],
      };

      queryClient.setQueryData<DbRecognition[]>(key, old => [optimistic, ...(old ?? [])]);
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: qk.recognitions(input.org_id) });
      queryClient.invalidateQueries({ queryKey: qk.currentUser() });
      queryClient.invalidateQueries({ queryKey: qk.orgUsers(input.org_id) });
      queryClient.invalidateQueries({ queryKey: qk.leaderboard(input.org_id, 'week') });
      queryClient.invalidateQueries({ queryKey: qk.leaderboard(input.org_id, 'month') });
      queryClient.invalidateQueries({ queryKey: qk.leaderboard(input.org_id, 'quarter') });
    },
  });
}
