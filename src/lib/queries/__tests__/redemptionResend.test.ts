import { describe, it, expect } from 'vitest';
import type { DbRedemption } from '../rewards';

function canResend(r: Pick<DbRedemption, 'status' | 'resent_count'>, actioning: boolean) {
  return r.status === 'fulfilled' && !actioning && (r.resent_count ?? 0) < 3;
}

describe('redemption resend cap', () => {
  const base = {
    id: 'r', user_id: 'u', reward_id: 'w', points_spent: 100,
    requested_at: '', processed_at: null, processed_by: null,
    fulfillment_code: 'X', resent_at: null, reward: null, user: null,
  } as unknown as DbRedemption;

  it('allows resend when fulfilled and count below 3', () => {
    expect(canResend({ ...base, status: 'fulfilled', resent_count: 0 }, false)).toBe(true);
    expect(canResend({ ...base, status: 'fulfilled', resent_count: 2 }, false)).toBe(true);
  });

  it('blocks resend when at cap', () => {
    expect(canResend({ ...base, status: 'fulfilled', resent_count: 3 }, false)).toBe(false);
    expect(canResend({ ...base, status: 'fulfilled', resent_count: 5 }, false)).toBe(false);
  });

  it('blocks resend when not yet fulfilled', () => {
    expect(canResend({ ...base, status: 'pending', resent_count: 0 }, false)).toBe(false);
    expect(canResend({ ...base, status: 'approved', resent_count: 0 }, false)).toBe(false);
  });

  it('blocks resend while actioning', () => {
    expect(canResend({ ...base, status: 'fulfilled', resent_count: 0 }, true)).toBe(false);
  });
});
