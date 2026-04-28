import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useApproveRedemption } from '../useApproveRedemption';
import { qk } from '@/lib/queries/keys';

const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useApproveRedemption', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls update on redemptions with correct status=approved', async () => {
    const { result } = renderHook(() => useApproveRedemption(), { wrapper });
    await act(async () => {
      result.current.mutate({ redemption_id: 'red-1', status: 'approved', org_id: 'org-1', processed_by: 'admin-1' });
    });
    expect(mockFrom).toHaveBeenCalledWith('redemptions');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        processed_by: 'admin-1',
        processed_at: expect.any(String),
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'red-1');
  });

  it('calls update on redemptions with correct status=cancelled', async () => {
    const { result } = renderHook(() => useApproveRedemption(), { wrapper });
    await act(async () => {
      result.current.mutate({ redemption_id: 'red-2', status: 'cancelled', org_id: 'org-1', processed_by: 'admin-1' });
    });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
  });

  it('processed_at is a valid ISO string', async () => {
    const { result } = renderHook(() => useApproveRedemption(), { wrapper });
    await act(async () => {
      result.current.mutate({ redemption_id: 'red-3', status: 'approved', org_id: 'org-1', processed_by: 'admin-1' });
    });
    const { processed_at } = mockUpdate.mock.calls[0][0];
    expect(() => new Date(processed_at)).not.toThrow();
    expect(new Date(processed_at).toISOString()).toBe(processed_at);
  });
});
