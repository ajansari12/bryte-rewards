import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInviteTeammate } from '../useInviteTeammate';

const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: 'tok-abc' } },
});
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: mockGetSession } },
}));

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ message: 'invited' }),
});
vi.stubGlobal('fetch', mockFetch);

// Provide VITE env var
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useInviteTeammate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs to the invite-teammate edge function with correct body', async () => {
    const { result } = renderHook(() => useInviteTeammate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ email: 'alice@example.com', org_id: 'org-1', role: 'employee' });
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/invite-teammate'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ email: 'alice@example.com', org_id: 'org-1', role: 'employee' }),
      })
    );
  });

  it('throws when the function returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'already invited' }),
    });
    const { result } = renderHook(() => useInviteTeammate(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ email: 'bob@example.com', org_id: 'org-1' }))
        .rejects.toThrow('already invited');
    });
  });
});
