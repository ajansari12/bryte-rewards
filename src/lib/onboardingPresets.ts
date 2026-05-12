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
  name: string;
  description: string;
  points: number;
  category: string;
  icon: string;
}

const STARTER_REWARDS: RewardSeed[] = [
  { name: '$25 gift card', description: 'Amazon or a local favourite — your pick.', points: 2500, category: 'Gift cards', icon: '🎁' },
  { name: 'Team lunch', description: 'Lunch on the company, any spot under $30.', points: 1500, category: 'Experiences', icon: '🥪' },
  { name: 'Extra PTO day', description: 'Take a paid day off, any time in the next quarter.', points: 5000, category: 'Time off', icon: '🌿' },
  { name: 'Coffee run', description: 'Coffee and a pastry on us, up to $15.', points: 600, category: 'Treats', icon: '☕' },
];

export function starterRewards(): RewardSeed[] {
  return STARTER_REWARDS;
}

