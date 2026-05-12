import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/lib/queries/users';
import { qk } from '@/lib/queries/keys';

// Subscribes to postgres_changes across content tables and invalidates the
// matching query keys so the UI stays fresh without manual refetches.
export function useRealtimeSync() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.org_id || !user?.id) return;
    const orgId = user.org_id;
    const userId = user.id;

    const orgFilter = `org_id=eq.${orgId}`;

    const channel = supabase
      .channel(`org-realtime:${orgId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          // comments has no org_id column; invalidate on any change but only the
          // affected recognition's comment list.
          const row = (payload.new ?? payload.old) as { recognition_id?: string } | null;
          if (row?.recognition_id) {
            queryClient.invalidateQueries({ queryKey: qk.comments(row.recognition_id) });
          }
          queryClient.invalidateQueries({ queryKey: qk.recognitions(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.recognitions(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'redemptions', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.redemptions(userId) });
          queryClient.invalidateQueries({ queryKey: qk.orgRedemptions(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'nominations', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.nominations(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'recognitions', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.recognitions(orgId) });
          queryClient.invalidateQueries({ queryKey: qk.feedStats(orgId) });
          queryClient.invalidateQueries({ queryKey: qk.leaderboard(orgId, 'week') });
          queryClient.invalidateQueries({ queryKey: qk.leaderboard(orgId, 'month') });
          queryClient.invalidateQueries({ queryKey: qk.leaderboard(orgId, 'quarter') });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.orgUsers(orgId) });
          queryClient.invalidateQueries({ queryKey: qk.currentUser() });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'values', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.orgValues(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'badges', filter: orgFilter },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.badges(orgId) });
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.notifications(userId) });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.org_id, user?.id, queryClient]);
}
