import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGiveRecognition } from '../useGiveRecognition';

const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null });
const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({ single: mockSingle });

const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const baseInput = {
  org_id: 'org-1',
  sender_id: 'user-sender',
  recipient_id: 'user-recipient',
  value_id: 'val-1',
  message: 'Great work!',
  points: 50,
  type: 'public' as const,
  _senderName: 'Alice',
  _senderRole: 'employee',
  _recipientName: 'Bob',
  _valueName: 'Innovation',
  _valueIcon: '💡',
};

describe('useGiveRecognition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls insert with correct payload fields', async () => {
    const { result } = renderHook(() => useGiveRecognition(), { wrapper });
    await act(async () => { result.current.mutate(baseInput); });
    expect(mockFrom).toHaveBeenCalledWith('recognitions');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        sender_id: 'user-sender',
        recipient_id: 'user-recipient',
        value_id: 'val-1',
        message: 'Great work!',
        points: 50,
        type: 'public',
      })
    );
  });

  it('does not send display-only _fields to the database', async () => {
    const { result } = renderHook(() => useGiveRecognition(), { wrapper });
    await act(async () => { result.current.mutate(baseInput); });
    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall).not.toHaveProperty('_senderName');
    expect(insertCall).not.toHaveProperty('_recipientName');
  });

  it('works with null value_id', async () => {
    const { result } = renderHook(() => useGiveRecognition(), { wrapper });
    await act(async () => { result.current.mutate({ ...baseInput, value_id: null, _valueName: null, _valueIcon: null }); });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ value_id: null }));
  });
});
