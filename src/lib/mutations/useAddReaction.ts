import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbRecognition } from '@/lib/queries/recognitions';

interface AddReactionInput {
  recognition_id: string;
  user_id: string;
  emoji: string;
  org_id: string;
  toggle: boolean; // true = add, false = remove
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddReactionInput) => {
      if (input.toggle) {
        const { error } = await supabase
          .from('reactions')
          .insert({ recognition_id: input.recognition_id, user_id: input.user_id, emoji: input.emoji });
        if (error && error.code !== '23505') throw error; // ignore duplicate
      } else {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('recognition_id', input.recognition_id)
          .eq('user_id', input.user_id)
          .eq('emoji', input.emoji);
        if (error) throw error;
      }
    },
    onMutate: async (input) => {
      const key = qk.recognitions(input.org_id);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbRecognition[]>(key);

      queryClient.setQueryData<DbRecognition[]>(key, old =>
        (old ?? []).map(rec => {
          if (rec.id !== input.recognition_id) return rec;
          const reactions = rec.reactions.filter(
            r => !(r.user_id === input.user_id && r.emoji === input.emoji)
          );
          if (input.toggle) {
            reactions.push({ recognition_id: input.recognition_id, user_id: input.user_id, emoji: input.emoji });
          }
          return { ...rec, reactions };
        })
      );

      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: qk.recognitions(input.org_id) });
    },
  });
}
