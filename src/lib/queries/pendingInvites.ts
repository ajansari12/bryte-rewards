import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PendingInvite {
  id: string;
  email: string;
  invited_at: string | null;
  role: string | null;
}

export function usePendingInvites(enabled = true) {
  return useQuery({
    queryKey: ['pendingInvites'],
    queryFn: async (): Promise<PendingInvite[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-pending-invites`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to load invites' }));
        throw new Error(err.message);
      }
      const body = await res.json() as { invites: PendingInvite[] };
      return body.invites;
    },
    enabled,
    staleTime: 60_000,
  });
}
