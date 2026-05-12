// Industry-specific badge packs used to seed the `badges` table when an
// org completes onboarding. Eight common milestones are shared across all
// industries; the last three are industry-flavoured.

interface BadgeSeed {
  name: string;
  icon: string;
  category: string;
  criteria: string;
  is_seasonal: boolean;
}

const SHARED: BadgeSeed[] = [
  { name: 'First Recognition', icon: '✦', category: 'Milestones', criteria: 'Send your first recognition', is_seasonal: false },
  { name: 'Mentor', icon: '📖', category: 'Leadership', criteria: 'Onboard a new teammate', is_seasonal: false },
  { name: '10-Day Streak', icon: '🔥', category: 'Consistency', criteria: 'Recognise someone 10 days in a row', is_seasonal: false },
  { name: '100 Recognitions', icon: '🎉', category: 'Milestones', criteria: 'Team hits 100 recognitions this month', is_seasonal: false },
  { name: "Founder's Circle", icon: '✶', category: 'Milestones', criteria: 'First 50 people on your team to join Bryte', is_seasonal: false },
  { name: 'Heavy Lifter', icon: '💪', category: 'Consistency', criteria: 'Give 30+ recognitions in a quarter', is_seasonal: false },
];

const INDUSTRY_BADGES: Record<string, BadgeSeed[]> = {
  healthcare: [
    { name: 'Patient Champion', icon: '🫀', category: 'Values', criteria: 'Top Patient First recognitions this quarter', is_seasonal: false },
    { name: 'Safety Stop', icon: '🛡️', category: 'Values', criteria: 'Caught a safety issue before it reached a patient', is_seasonal: false },
    { name: 'Quiet Compassion', icon: '💛', category: 'Seasonal', criteria: 'Recognised five teammates for compassion', is_seasonal: true },
  ],
  construction: [
    { name: 'Zero-Incident Month', icon: '🦺', category: 'Values', criteria: 'Crew completed a month with zero incidents', is_seasonal: false },
    { name: 'Craft Pride', icon: '🔨', category: 'Values', criteria: 'Top Craft Pride recognitions this quarter', is_seasonal: false },
    { name: 'On Schedule', icon: '📐', category: 'Seasonal', criteria: 'Finished a phase on or ahead of schedule', is_seasonal: true },
  ],
  retail: [
    { name: 'Guest Magic', icon: '💛', category: 'Values', criteria: 'Top Guest Moments recognitions this month', is_seasonal: false },
    { name: 'Floor Lead', icon: '🛍️', category: 'Leadership', criteria: 'Mentored new hires through first shift', is_seasonal: false },
    { name: 'Holiday Hero', icon: '🎁', category: 'Seasonal', criteria: 'Recognised through a peak-season week', is_seasonal: true },
  ],
  technology: [
    { name: 'Unblocker', icon: '🔓', category: 'Values', criteria: 'Most Unblocker recognitions this quarter', is_seasonal: false },
    { name: 'Ship It', icon: '🚀', category: 'Values', criteria: 'Shipped five features in a sprint', is_seasonal: false },
    { name: 'Wrote It Down', icon: '📝', category: 'Seasonal', criteria: 'Recognised five times for docs', is_seasonal: true },
  ],
  hospitality: [
    { name: 'Guest Save', icon: '💛', category: 'Values', criteria: 'Turned around a guest issue this quarter', is_seasonal: false },
    { name: 'Quiet Detail', icon: '🕯️', category: 'Values', criteria: 'Recognised for service poise', is_seasonal: false },
    { name: 'Holiday Crew', icon: '🍷', category: 'Seasonal', criteria: 'Worked through a holiday service block', is_seasonal: true },
  ],
  financial: [
    { name: 'Client Champion', icon: '✦', category: 'Values', criteria: 'Top Client Excellence recognitions this quarter', is_seasonal: false },
    { name: 'Careful Work', icon: '📐', category: 'Values', criteria: 'Caught an error before it shipped to a client', is_seasonal: false },
    { name: 'Quiet Integrity', icon: '💠', category: 'Seasonal', criteria: 'Recognised five times for integrity', is_seasonal: true },
  ],
};

export function badgesForIndustry(industry: string): BadgeSeed[] {
  return [...SHARED, ...(INDUSTRY_BADGES[industry] ?? INDUSTRY_BADGES.healthcare)];
}

export interface RewardSeed {
  title: string;
  brand: string;
  denom: string;
  points: number;
  color: string;
  kind: 'gift' | 'experience' | 'donate';
}

const COLORS = ['#4A90A4', '#E8836A', '#6BA886', '#C68B3B', '#8B5A3C', '#5D7BA0'];
const c = (i: number) => COLORS[i % COLORS.length];

const SHARED_REWARDS: RewardSeed[] = [
  { title: 'Gift card', brand: 'Amazon',      denom: '$25', points: 2500, color: c(0), kind: 'gift' },
  { title: 'Gift card', brand: 'Amazon',      denom: '$50', points: 5000, color: c(0), kind: 'gift' },
  { title: 'Coffee run', brand: 'Local café', denom: '$15', points: 600,  color: c(1), kind: 'experience' },
  { title: 'Team lunch', brand: 'Your pick',  denom: '$30', points: 1500, color: c(2), kind: 'experience' },
  { title: 'Extra PTO day', brand: 'One paid day off', denom: '', points: 5000, color: c(3), kind: 'experience' },
  { title: 'Charity donation', brand: 'Choose a cause', denom: '$25', points: 2500, color: c(4), kind: 'donate' },
];

const INDUSTRY_REWARDS: Record<string, RewardSeed[]> = {
  healthcare: [
    { title: 'Scrubs stipend',     brand: 'New scrubs on us',   denom: '$75', points: 7500, color: c(5), kind: 'gift' },
    { title: 'Cafeteria credit',   brand: 'On-site cafeteria',  denom: '$20', points: 2000, color: c(1), kind: 'experience' },
    { title: 'Wellness class',     brand: 'Yoga or meditation', denom: '1 class', points: 1800, color: c(2), kind: 'experience' },
  ],
  construction: [
    { title: 'Gear voucher',       brand: 'Tool shop',          denom: '$100', points: 10000, color: c(3), kind: 'gift' },
    { title: 'Steel-toe boots',    brand: 'Work-boot stipend',  denom: '$150', points: 15000, color: c(4), kind: 'gift' },
    { title: 'Early Friday',       brand: 'Clock out at 2pm',   denom: '', points: 3000, color: c(2), kind: 'experience' },
  ],
  retail: [
    { title: 'Store credit',       brand: 'Our store',          denom: '$40', points: 4000, color: c(0), kind: 'gift' },
    { title: 'Comp ticket',        brand: 'Partner venue',      denom: '1 seat', points: 2500, color: c(5), kind: 'experience' },
    { title: 'Shift-swap priority', brand: 'Next schedule',     denom: '', points: 1200, color: c(2), kind: 'experience' },
  ],
  technology: [
    { title: 'Home office gear',   brand: 'Desk upgrade',       denom: '$100', points: 10000, color: c(5), kind: 'gift' },
    { title: 'Conference ticket',  brand: 'Of your choice',     denom: '1 seat', points: 12000, color: c(3), kind: 'experience' },
    { title: 'Dev book bundle',    brand: 'Any 3 books',        denom: '$75', points: 3500, color: c(4), kind: 'gift' },
  ],
  hospitality: [
    { title: 'Dinner for two',     brand: 'Partner restaurant', denom: '$100', points: 10000, color: c(1), kind: 'experience' },
    { title: 'Spa night',          brand: 'Local spa',          denom: '1 visit', points: 8000, color: c(5), kind: 'experience' },
    { title: 'Uniform allowance',  brand: 'Shirt and shoes',    denom: '$75', points: 7500, color: c(4), kind: 'gift' },
  ],
  financial: [
    { title: 'Pro development',    brand: 'Course or cert',     denom: '$200', points: 20000, color: c(0), kind: 'gift' },
    { title: 'Commuter stipend',   brand: 'Transit pass',       denom: '$75', points: 7500, color: c(5), kind: 'gift' },
    { title: 'Desk upgrade',       brand: 'Chair or monitor',   denom: '$150', points: 15000, color: c(3), kind: 'gift' },
  ],
};

export function starterRewardsForIndustry(industry: string): RewardSeed[] {
  return [...SHARED_REWARDS, ...(INDUSTRY_REWARDS[industry] ?? INDUSTRY_REWARDS.technology)];
}

export function starterRewards(): RewardSeed[] {
  return starterRewardsForIndustry('technology');
}

export const REWARD_INDUSTRIES = ['healthcare', 'construction', 'retail', 'technology', 'hospitality', 'financial'] as const;
export type RewardIndustry = typeof REWARD_INDUSTRIES[number];

export function universalRewards(): RewardSeed[] {
  return [...SHARED_REWARDS];
}

export function industryOnlyRewards(industry: string): RewardSeed[] {
  return INDUSTRY_REWARDS[industry] ?? [];
}

export function rewardDedupKey(r: Pick<RewardSeed, 'title' | 'brand' | 'denom'>): string {
  return [r.title, r.brand, r.denom].map(s => (s ?? '').trim().toLowerCase()).join('|');
}

