import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from './users';
import { qk } from './keys';

export interface DbReaction {
  recognition_id: string;
  user_id: string;
  emoji: string;
}

export interface DbRecognition {
  id: string;
  org_id: string;
  sender_id: string;
  recipient_id: string;
  value_id: string | null;
  message: string;
  points: number;
  type: 'public' | 'private' | 'milestone' | 'spotlight';
  created_at: string;
  sender: { display_name: string; role: string } | null;
  recipient: { display_name: string; role: string } | null;
  value: { name: string; icon: string; points: number } | null;
  reactions: DbReaction[];
}

const RECOGNITION_SELECT = `
  id, org_id, sender_id, recipient_id, value_id, message, points, type, created_at,
  sender:users!sender_id(display_name, role),
  recipient:users!recipient_id(display_name, role),
  value:values(name, icon, points),
  reactions(recognition_id, user_id, emoji)
`;

export function useRecognitions() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.recognitions(user?.org_id ?? ''),
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from('recognitions')
        .select(RECOGNITION_SELECT)
        .eq('org_id', user.org_id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as DbRecognition[];
    },
    enabled: !!user?.org_id,
    staleTime: 30_000,
  });
}

export function useMyRecognitions() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: qk.myRecognitions(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recognitions')
        .select(RECOGNITION_SELECT)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as DbRecognition[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
