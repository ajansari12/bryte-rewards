import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

const mockCurrentUser = { id: 'u1', org_id: 'o1', role: 'admin', display_name: 'A' };
vi.mock('@/lib/queries/users', () => ({
  useCurrentUser: () => ({ data: mockCurrentUser }),
}));

const dbNotifs = [
  { id: 'n1', kind: 'redemption_requested', payload_json: { sender_name: 'Ava', reward_title: 'Gift card' }, read_at: null, created_at: new Date().toISOString() },
  { id: 'n2', kind: 'nomination_pending', payload_json: { nominee_name: 'Ben', badge_name: 'Top Collaborator' }, read_at: null, created_at: new Date().toISOString() },
  { id: 'n3', kind: 'approval', payload_json: { status: 'approved', reward_title: 'Swag' }, read_at: null, created_at: new Date().toISOString() },
  { id: 'n4', kind: 'unknown_kind_fallback', payload_json: { sender_name: 'Zoe' }, read_at: new Date().toISOString(), created_at: new Date().toISOString() },
];

vi.mock('@/lib/queries/notifications', () => ({
  useNotifications: () => ({ data: dbNotifs }),
}));

vi.mock('@/lib/mutations/useMarkNotificationsRead', () => ({
  useMarkNotificationsRead: () => ({ mutate: vi.fn() }),
}));

import { useNotificationSync } from '../useNotificationSync';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNotificationSync kindMap', () => {
  it('maps redemption_requested to approval type with custom message', () => {
    const { result } = renderHook(() => useNotificationSync(), { wrapper });
    const n1 = result.current.notifs.find(n => n.kind === 'redemption_requested')!;
    expect(n1.type).toBe('approval');
    expect(n1.msg).toContain('Ava');
    expect(n1.msg).toContain('Gift card');
  });

  it('maps nomination_pending to badge type with nominee + badge', () => {
    const { result } = renderHook(() => useNotificationSync(), { wrapper });
    const n2 = result.current.notifs.find(n => n.kind === 'nomination_pending')!;
    expect(n2.type).toBe('badge');
    expect(n2.msg).toContain('Ben');
    expect(n2.msg).toContain('Top Collaborator');
  });

  it('maps approval status into message', () => {
    const { result } = renderHook(() => useNotificationSync(), { wrapper });
    const n3 = result.current.notifs.find(n => n.kind === 'approval')!;
    expect(n3.msg.toLowerCase()).toContain('approved');
  });

  it('falls back to received type for unknown kinds', () => {
    const { result } = renderHook(() => useNotificationSync(), { wrapper });
    const n4 = result.current.notifs.find(n => n.kind === 'unknown_kind_fallback')!;
    expect(n4.type).toBe('received');
  });

  it('counts unread correctly', () => {
    const { result } = renderHook(() => useNotificationSync(), { wrapper });
    expect(result.current.unreadCount).toBe(3);
  });
});
