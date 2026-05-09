import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from './keys';

export interface DbComment {
  id: string;
  recognition_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { display_name: string; role: string };
}

export function useComments(recognitionId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!recognitionId) return;
    const channel = supabase
      .channel(`comments:${recognitionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `recognition_id=eq.${recognitionId}` },
        () => { queryClient.invalidateQueries({ queryKey: qk.comments(recognitionId) }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recognitionId, queryClient]);

  return useQuery({
    queryKey: qk.comments(recognitionId ?? ''),
    queryFn: async () => {
      if (!recognitionId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select('id, recognition_id, author_id, body, created_at, author:users!comments_author_id_fkey(display_name, role)')
        .eq('recognition_id', recognitionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DbComment[];
    },
    enabled: !!recognitionId,
    staleTime: 30_000,
  });
}
