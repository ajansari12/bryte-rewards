import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAddReaction } from '../useAddReaction';

const mockDeleteEq3 = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq2 = vi.fn().mockReturnValue({ eq: mockDeleteEq3 });
const mockDeleteEq1 = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });
const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq1 });
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert, delete: mockDelete });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const base = { recognition_id: 'rec-1', user_id: 'user-1', emoji: '👏', org_id: 'org-1' };

describe('useAddReaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a reaction when toggle=true', async () => {
    const { result } = renderHook(() => useAddReaction(), { wrapper });
    await act(async () => { result.current.mutate({ ...base, toggle: true }); });
    expect(mockFrom).toHaveBeenCalledWith('reactions');
    expect(mockInsert).toHaveBeenCalledWith({
      recognition_id: 'rec-1',
      user_id: 'user-1',
      emoji: '👏',
    });
  });

  it('deletes a reaction when toggle=false', async () => {
    const { result } = renderHook(() => useAddReaction(), { wrapper });
    await act(async () => { result.current.mutate({ ...base, toggle: false }); });
    expect(mockFrom).toHaveBeenCalledWith('reactions');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq1).toHaveBeenCalledWith('recognition_id', 'rec-1');
    expect(mockDeleteEq2).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockDeleteEq3).toHaveBeenCalledWith('emoji', '👏');
  });

  it('does not call delete when toggle=true', async () => {
    const { result } = renderHook(() => useAddReaction(), { wrapper });
    await act(async () => { result.current.mutate({ ...base, toggle: true }); });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
