import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNominateBadge } from '../useNominateBadge';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'nominator-1' } } });

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNominateBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts into nominations with correct fields', async () => {
    const { result } = renderHook(() => useNominateBadge(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        org_id: 'org-1',
        badge_id: 'badge-1',
        nominee_id: 'user-nominee',
        reason: 'Outstanding performance',
      });
    });
    expect(mockFrom).toHaveBeenCalledWith('nominations');
    expect(mockInsert).toHaveBeenCalledWith({
      org_id: 'org-1',
      badge_id: 'badge-1',
      nominator_id: 'nominator-1',
      nominee_id: 'user-nominee',
      reason: 'Outstanding performance',
    });
  });

  it('throws when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { result } = renderHook(() => useNominateBadge(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ org_id: 'o', badge_id: 'b', nominee_id: 'n', reason: '' }))
        .rejects.toThrow('not authenticated');
    });
  });
});
