import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateValues } from '../useUpdateValues';

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const input = {
  org_id: 'org-1',
  values: [
    { id: 'val-1', name: 'Innovation', icon: '💡', points: 50, sort_order: 0 },
    { name: 'Teamwork', icon: '🤝', points: 30, sort_order: 1 },
  ],
};

describe('useUpdateValues', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts into values table', async () => {
    const { result } = renderHook(() => useUpdateValues(), { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    expect(mockFrom).toHaveBeenCalledWith('values');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'val-1', org_id: 'org-1', name: 'Innovation', points: 50 }),
        expect.objectContaining({ org_id: 'org-1', name: 'Teamwork', points: 30 }),
      ]),
      { onConflict: 'id' }
    );
  });

  it('includes org_id on every row', async () => {
    const { result } = renderHook(() => useUpdateValues(), { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    const rows: Array<Record<string, unknown>> = mockUpsert.mock.calls[0][0];
    expect(rows.every(r => r.org_id === 'org-1')).toBe(true);
  });

  it('omits id field for new values without an id', async () => {
    const { result } = renderHook(() => useUpdateValues(), { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    const rows: Array<Record<string, unknown>> = mockUpsert.mock.calls[0][0];
    const newRow = rows.find(r => r.name === 'Teamwork');
    expect(newRow).not.toHaveProperty('id');
  });
});
