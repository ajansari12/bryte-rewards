import { describe, it, expect } from 'vitest';
import { starterRewardsForIndustry, badgesForIndustry } from '../onboardingPresets';

const INDUSTRIES = ['healthcare', 'construction', 'retail', 'technology', 'hospitality', 'financial'];
const VALID_KINDS = new Set(['gift', 'experience', 'donate']);

describe('starterRewardsForIndustry', () => {
  it('returns at least 6 rewards for every supported industry', () => {
    for (const industry of INDUSTRIES) {
      const rewards = starterRewardsForIndustry(industry);
      expect(rewards.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('every reward has a non-empty title, positive points, and a valid kind', () => {
    for (const industry of INDUSTRIES) {
      for (const r of starterRewardsForIndustry(industry)) {
        expect(r.title.trim().length).toBeGreaterThan(0);
        expect(r.points).toBeGreaterThan(0);
        expect(VALID_KINDS.has(r.kind)).toBe(true);
      }
    }
  });

  it('falls back to a default pack for unknown industries without throwing', () => {
    const rewards = starterRewardsForIndustry('not-a-real-industry');
    expect(rewards.length).toBeGreaterThanOrEqual(6);
  });

  it('produces rows whose column names match the rewards schema', () => {
    const [first] = starterRewardsForIndustry('technology');
    expect(Object.keys(first).sort()).toEqual(
      ['brand', 'color', 'denom', 'kind', 'points', 'title'].sort()
    );
  });
});

describe('badgesForIndustry', () => {
  it('returns at least one badge for every industry', () => {
    for (const industry of INDUSTRIES) {
      expect(badgesForIndustry(industry).length).toBeGreaterThan(0);
    }
  });
});
