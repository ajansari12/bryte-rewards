import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateNotificationPrefs } from '../useUpdateNotificationPrefs';

const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useUpdateNotificationPrefs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the users table with correct prefs shape', async () => {
    const { result } = renderHook(() => useUpdateNotificationPrefs(), { wrapper });
    const prefs = { in_app: true, email_immediate: false, email_digest: true };
    await act(async () => {
      await result.current.mutateAsync({ userId: 'user-1', prefs });
    });
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockUpdate).toHaveBeenCalledWith({ notification_prefs: prefs });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('sends all three pref keys', async () => {
    const { result } = renderHook(() => useUpdateNotificationPrefs(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'u', prefs: { in_app: false, email_immediate: true, email_digest: false } });
    });
    const payload = mockUpdate.mock.calls[0][0].notification_prefs;
    expect(payload).toHaveProperty('in_app', false);
    expect(payload).toHaveProperty('email_immediate', true);
    expect(payload).toHaveProperty('email_digest', false);
  });
});
