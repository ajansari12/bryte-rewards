import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface InviteTeammateInput {
  email: string;
  org_id: string;
  role?: 'employee' | 'manager';
}

export function useInviteTeammate() {
  return useMutation({
    mutationFn: async (input: InviteTeammateInput) => {
      // Invites via the invite-teammate Edge Function which uses the service role key
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-teammate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );
      const payload = await res.json().catch(() => null) as { message?: string; error?: string; code?: string } | null;
      if (!res.ok) {
        const message = payload?.message || payload?.error || `Invite failed (${res.status})`;
        const error = new Error(message) as Error & { code?: string };
        if (payload?.code) error.code = payload.code;
        throw error;
      }
      return payload;
    },
  });
}
