import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

interface PostCommentInput {
  recognition_id: string;
  author_id: string;
  body: string;
}

export function usePostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostCommentInput) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          recognition_id: input.recognition_id,
          author_id: input.author_id,
          body: input.body.slice(0, 280),
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: qk.comments(input.recognition_id) });
    },
  });
}
