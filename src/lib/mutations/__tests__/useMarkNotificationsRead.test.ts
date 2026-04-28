import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMarkNotificationsRead } from '../useMarkNotificationsRead';

const mockIs = vi.fn().mockResolvedValue({ error: null });
const mockEq = vi.fn().mockReturnValue({ is: mockIs });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMarkNotificationsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates notifications table filtering by user_id and null read_at', async () => {
    const { result } = renderHook(() => useMarkNotificationsRead(), { wrapper });
    await act(async () => { await result.current.mutateAsync('user-123'); });
    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(mockUpdate).toHaveBeenCalledWith({ read_at: expect.any(String) });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockIs).toHaveBeenCalledWith('read_at', null);
  });

  it('sets read_at to a valid ISO timestamp', async () => {
    const { result } = renderHook(() => useMarkNotificationsRead(), { wrapper });
    await act(async () => { await result.current.mutateAsync('user-456'); });
    const { read_at } = mockUpdate.mock.calls[0][0];
    expect(new Date(read_at).toISOString()).toBe(read_at);
  });
});
