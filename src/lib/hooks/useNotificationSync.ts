import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/lib/queries/users';
import { useNotifications, type DbNotification } from '@/lib/queries/notifications';
import { useMarkNotificationsRead } from '@/lib/mutations/useMarkNotificationsRead';
import { qk } from '@/lib/queries/keys';
import type { Notification } from '@/lib/types';

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function toUiNotif(n: DbNotification): Notification {
  const p = n.payload_json as Record<string, string>;
  const kindMap: Record<string, Notification['type']> = {
    recognition: 'received',
    team_recognition: 'received',
    reaction: 'reaction',
    badge: 'badge',
    milestone: 'milestone',
    comment: 'comment',
    approval: 'approval',
  };

  const type = (kindMap[n.kind] ?? 'received') as Notification['type'];
  let msg = p.sender_name ? `${p.sender_name} recognised you` : 'You were recognised';
  if (n.kind === 'team_recognition') {
    msg = p.sender_name
      ? `${p.sender_name} recognised ${p.recipient_name ?? 'your teammate'}`
      : 'Your team member was recognised';
  }
  const sub = [
    p.value_name ? `for ${p.value_name}` : '',
    p.message_snippet ? `"${p.message_snippet}"` : '',
    p.points ? `+${p.points} pts` : '',
  ].filter(Boolean).join(' · ');

  return {
    id: n.id as unknown as number,
    type,
    msg,
    sub,
    time: formatRelTime(n.created_at),
    read: n.read_at !== null,
  };
}

export function useNotificationSync() {
  const { data: currentUser } = useCurrentUser();
  const { data: dbNotifs = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const queryClient = useQueryClient();

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.notifications(currentUser.id) });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, queryClient]);

  const notifs = dbNotifs.map(toUiNotif);
  const unreadCount = dbNotifs.filter(n => n.read_at === null).length;

  const markAllRead = useCallback(() => {
    if (currentUser?.id) markRead.mutate(currentUser.id);
  }, [currentUser?.id, markRead]);

  return { notifs, unreadCount, markAllRead };
}
