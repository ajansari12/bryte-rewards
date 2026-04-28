import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRequestRedemption } from '../useRequestRedemption';

const mockRpc = vi.fn().mockResolvedValue({ data: 'redemption-id-123', error: null });
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mockRpc } }));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { wrapper: Wrapper, qc };
}

describe('useRequestRedemption', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls redeem_reward RPC with correct params', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useRequestRedemption(), { wrapper });
    await act(async () => {
      result.current.mutate({ reward_id: 'reward-abc', user_id: 'user-xyz' });
    });
    expect(mockRpc).toHaveBeenCalledWith('redeem_reward', {
      p_reward_id: 'reward-abc',
      p_user_id: 'user-xyz',
    });
  });

  it('returns the redemption id from the RPC', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useRequestRedemption(), { wrapper });
    let returned: string | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({ reward_id: 'reward-abc', user_id: 'user-xyz' });
    });
    expect(returned).toBe('redemption-id-123');
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'insufficient points' } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useRequestRedemption(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ reward_id: 'r', user_id: 'u' })).rejects.toMatchObject({ message: 'insufficient points' });
    });
  });
});
