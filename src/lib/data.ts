import type { Notification } from './types';

export const SAMPLE_NOTIFS: Notification[] = [
  { id: 1, type: 'received', msg: 'Marcus Chen recognised you', sub: '"Incredibly steady under pressure this week." · +50 pts', time: '2h ago', read: false },
  { id: 2, type: 'reaction', msg: 'Sofia Alvarez reacted to your post', sub: '❤️ on your recognition of Devon Park', time: '4h ago', read: false },
  { id: 3, type: 'badge', msg: "You earned a new badge", sub: '🔥 10-Day Streak — consistency pays off', time: '1d ago', read: true },
  { id: 4, type: 'milestone', msg: "Team hit 100 recognitions this month", sub: 'A new record for Mapleview Medical ✦', time: '1d ago', read: true },
  { id: 5, type: 'received', msg: 'Amélie Tremblay recognised you', sub: '"Three years of clinical excellence." · +100 pts', time: '3d ago', read: true },
];

interface Industry {
  name: string;
  icon: string;
  org: string;
  orgTagline: string;
  values: { id: string; name: string; icon: string; points: number }[];
  sampleRecs: {
    sender: string;
    senderRole: string;
    recipient: string;
    value: string;
    message: string;
    points: number;
    time: string;
    type: 'public' | 'private' | 'milestone' | 'spotlight';
    reactions: Record<string, number>;
  }[];
  emptyState: string;
}

interface BryteData {
  INDUSTRIES: Record<string, Industry>;
  CURRENT_USER: { name: string; displayName: string; role: string; title: string; points: number; initials: string };
  LEADERBOARD: Array<{ name: string; role: string; title: string; points: number; change: number; topValue: string }>;
  REWARDS: Array<{ title: string; brand: string; icon: string; denom: string; points: number; color: string }>;
  BADGES: Array<{ id: string; name: string; icon: string; category: string; earned: boolean; date?: string; criteria?: string }>;
  NOMINEES: Array<{ name: string; role: string; title: string; votes: number; quote: string }>;
  ANNIVERSARIES: Array<{ name: string; years: number; date: string; tenure: string }>;
  NOTIFICATIONS: Array<{ id: string; kind: string; actor: string; actorRole?: string; text: string; time: string; unread: boolean; value?: string; emoji?: string; snippet?: string; badge?: string; icon?: string }>;
  APPROVAL_QUEUE: Array<{ id: string; requester: string; reward: string; points: number; requested: string; status: string; reason: string }>;
  ORG_TREE: { name: string; role: string; title: string; tenure: string; points: number; isMe?: boolean; reports: any[] };
  SAMPLE_COMMENTS: Array<{ author: string; role: string; text: string; time: string }>;
  TEMPLATES: Array<{ cat: string; title: string; body: string }>;
  CUSTOM_REWARDS: Array<{ title: string; points: number; icon: string; color: string; kind: string; desc: string }>;
  INTEGRATIONS: Array<{ name: string; color: string; connected: boolean; desc: string }>;
}

export const BRYTE_DATA: BryteData = {
  INDUSTRIES: {
    healthcare: {
      name: 'Healthcare',
      icon: '🏥',
      org: 'Mapleview Medical',
      orgTagline: 'Regional health network · Ontario',
      values: [
        { id: 'patient', name: 'Patient First', icon: '🫀', points: 50 },
        { id: 'team', name: 'Team Lift', icon: '🤝', points: 30 },
        { id: 'safety', name: 'Safety Always', icon: '🛡️', points: 40 },
        { id: 'compassion', name: 'Compassion', icon: '💛', points: 40 },
        { id: 'excellence', name: 'Clinical Excellence', icon: '✦', points: 60 },
      ],
      sampleRecs: [
        { sender: 'Priya Deshmukh', senderRole: 'manager', recipient: 'Marcus Chen', value: 'Patient First', message: 'Sat with Mrs. Okafor for twenty minutes past shift change because she was anxious about her scan results. Small thing, huge thing.', points: 50, time: '2h ago', type: 'public', reactions: { '👏': 12, '❤️': 8, '🔥': 3 } },
        { sender: 'Jordan Wells', senderRole: 'employee', recipient: 'Sofia Alvarez', value: 'Safety Always', message: 'Caught a medication interaction the system missed. Flagged it, escalated it, probably prevented a really bad afternoon for a patient.', points: 40, time: '5h ago', type: 'public', reactions: { '👏': 24, '❤️': 11, '⭐': 6 } },
        { sender: 'Amélie Tremblay', senderRole: 'admin', recipient: 'Devon Park', value: 'Clinical Excellence', message: 'Ten-year anniversary this week. A decade of showing up for patients and teaching the rest of us how to do the same.', points: 100, time: '1d ago', type: 'milestone', reactions: { '🎉': 31, '❤️': 18, '⭐': 9 } },
        { sender: 'Maya Iyer', senderRole: 'employee', recipient: 'Chris Novak', value: 'Team Lift', message: "Covered my shift when my kid got sick. Didn't even ask why. Just said yes.", points: 30, time: '1d ago', type: 'public', reactions: { '❤️': 15, '👏': 7 } },
        { sender: 'Nkechi Obi', senderRole: 'manager', recipient: 'Emma Lindqvist', value: 'Compassion', message: 'The way she talks with families in the ICU — steady, honest, human. People remember her.', points: 40, time: '2d ago', type: 'spotlight', reactions: { '❤️': 22, '👏': 9, '⭐': 5 } },
        { sender: 'Ravi Sharma', senderRole: 'employee', recipient: 'Leila Haddad', value: 'Patient First', message: 'Noticed a discharged patient looked lost in the lobby. Sat with him, called his daughter, waited until she arrived.', points: 50, time: '3d ago', type: 'public', reactions: { '❤️': 14, '👏': 8 } },
        { sender: 'Theo Blackwood', senderRole: 'employee', recipient: 'Sana Al-Rashid', value: 'Team Lift', message: "Stayed late to onboard the two new RNs. They're going to be great because of it.", points: 30, time: '4d ago', type: 'public', reactions: { '👏': 10, '❤️': 6 } },
      ],
      emptyState: "The ward's quiet. Who on your team deserves a shoutout today?",
    },
    construction: {
      name: 'Construction',
      icon: '🏗️',
      org: 'Northshore Builders',
      orgTagline: 'Commercial construction · Vancouver',
      values: [
        { id: 'safety', name: 'Safety First', icon: '🦺', points: 60 },
        { id: 'craft', name: 'Craft Pride', icon: '🔨', points: 40 },
        { id: 'crew', name: 'Crew Loyalty', icon: '🤝', points: 30 },
        { id: 'onshed', name: 'On Schedule', icon: '📐', points: 40 },
        { id: 'quality', name: 'Built to Last', icon: '✦', points: 50 },
      ],
      sampleRecs: [
        { sender: 'Darren MacIntyre', senderRole: 'manager', recipient: 'Ezra Kim', value: 'Safety First', message: "Stopped the pour when he spotted rebar that wasn't right. Saved us a week and probably more than that. That's why we do the stop-work card.", points: 60, time: '3h ago', type: 'public', reactions: { '👏': 18, '🦺': 9, '🔥': 4 } },
        { sender: 'Beatrice Wong', senderRole: 'employee', recipient: 'Tomás Reyes', value: 'Crew Loyalty', message: "Drove an hour out of his way to pick up the foreman from the hospital. Didn't say a word about it. Crew knows.", points: 30, time: '6h ago', type: 'public', reactions: { '❤️': 20, '👏': 8 } },
        { sender: 'Mia Laurent', senderRole: 'admin', recipient: 'Kai Patel', value: 'Built to Last', message: 'Five years safe. Zero incidents on his crew. Gold standard, every day.', points: 100, time: '1d ago', type: 'milestone', reactions: { '🎉': 28, '🦺': 14, '⭐': 6 } },
        { sender: 'Silas Romano', senderRole: 'employee', recipient: 'Aria Johansson', value: 'Craft Pride', message: "The trim work on the west elevation — nobody will ever notice how good it is, which is the whole point.", points: 40, time: '2d ago', type: 'spotlight', reactions: { '👏': 16, '⭐': 8 } },
        { sender: 'Harper Cole', senderRole: 'employee', recipient: 'Finn Nakamura', value: 'On Schedule', message: 'Pulled the framing plan back on track after the delivery got pushed. Steady hand under pressure.', points: 40, time: '3d ago', type: 'public', reactions: { '👏': 11, '🔥': 5 } },
        { sender: 'Juno Okafor', senderRole: 'manager', recipient: 'Wren Davies', value: 'Safety First', message: "Ran the toolbox talk better than I would have. New guys were actually listening.", points: 60, time: '4d ago', type: 'public', reactions: { '👏': 14, '🦺': 7 } },
      ],
      emptyState: "No site wins shared yet. Who kept the crew safe this week?",
    },
    retail: {
      name: 'Retail',
      icon: '🛍️',
      org: 'Wilder & Oak',
      orgTagline: 'Home goods · 14 locations · Canada',
      values: [
        { id: 'guest', name: 'Guest Moments', icon: '💛', points: 40 },
        { id: 'floor', name: 'Floor Ready', icon: '🛍️', points: 30 },
        { id: 'team', name: 'Shift Together', icon: '🤝', points: 30 },
        { id: 'stories', name: 'Storytelling', icon: '📖', points: 40 },
        { id: 'above', name: 'Above & Beyond', icon: '✦', points: 50 },
      ],
      sampleRecs: [
        { sender: 'Cleo Marchetti', senderRole: 'manager', recipient: 'Sasha Hart', value: 'Guest Moments', message: "A woman was shopping for her mom's anniversary. Sasha walked her through the whole store for an hour. She cried on her way out. Good tears.", points: 40, time: '2h ago', type: 'public', reactions: { '❤️': 22, '👏': 11, '⭐': 5 } },
        { sender: 'Eli Woods', senderRole: 'employee', recipient: 'Indira Rao', value: 'Above & Beyond', message: "Stayed past close to help a guest wrap a last-minute wedding gift. Looked like she'd been doing gift-wrap for fifteen years.", points: 50, time: '1d ago', type: 'public', reactions: { '❤️': 14, '🎉': 6 } },
        { sender: 'Minerva Abiodun', senderRole: 'admin', recipient: 'Oskar Lindgren', value: 'Storytelling', message: 'Three years on the floor. Best closing write-ups in the company, genuinely. Promoted to assistant manager starting Monday.', points: 100, time: '2d ago', type: 'milestone', reactions: { '🎉': 29, '❤️': 13, '⭐': 8 } },
        { sender: 'Rex Bellamy', senderRole: 'employee', recipient: 'Noa Solberg', value: 'Shift Together', message: "Covered the register during the dinner rush without being asked. Then helped me close out the till. Then said good night. Saint.", points: 30, time: '3d ago', type: 'public', reactions: { '❤️': 9, '👏': 5 } },
      ],
      emptyState: "No floor moments yet. Which teammate went above and beyond today?",
    },
    technology: {
      name: 'Technology',
      icon: '💻',
      org: 'Pine Labs',
      orgTagline: 'SaaS · Remote-first · Canada',
      values: [
        { id: 'ship', name: 'Ship It', icon: '🚀', points: 40 },
        { id: 'unblock', name: 'Unblocker', icon: '🔓', points: 30 },
        { id: 'craft', name: 'Craft', icon: '✦', points: 50 },
        { id: 'customer', name: 'Customer Love', icon: '💛', points: 40 },
        { id: 'docs', name: 'Wrote It Down', icon: '📝', points: 30 },
      ],
      sampleRecs: [
        { sender: 'Vera Ostrowski', senderRole: 'manager', recipient: 'Mateus Ferreira', value: 'Unblocker', message: "Jumped into a thread at 9pm on Friday to unblock a customer rollout. Nobody asked him to. That's why we ship.", points: 30, time: '1h ago', type: 'public', reactions: { '🚀': 18, '❤️': 11, '🔥': 6 } },
        { sender: 'Anouk Lefebvre', senderRole: 'employee', recipient: 'Yusuf Demir', value: 'Craft', message: "The migration tool he built just… worked. No-one broke prod. That is a gift from one engineer to another.", points: 50, time: '4h ago', type: 'spotlight', reactions: { '⭐': 22, '❤️': 9, '🔥': 8 } },
        { sender: 'Ines Quinteros', senderRole: 'admin', recipient: 'Hallie Briggs', value: 'Ship It', message: 'First anniversary at Pine. Shipped 14 features, mentored two juniors, and somehow never broke staging once.', points: 100, time: '1d ago', type: 'milestone', reactions: { '🎉': 24, '🚀': 15, '❤️': 9 } },
        { sender: 'Bowen Reiss', senderRole: 'employee', recipient: 'Priya Menon', value: 'Customer Love', message: "Rewrote the onboarding email after sitting on three user calls. Activation is up 18%. Numbers don't lie.", points: 40, time: '2d ago', type: 'public', reactions: { '🚀': 13, '❤️': 7 } },
        { sender: 'Lior Ben-Ami', senderRole: 'employee', recipient: 'Aziz Kadir', value: 'Wrote It Down', message: 'The deploy runbook is now legible by mortals. Thank you on behalf of every future on-call.', points: 30, time: '3d ago', type: 'public', reactions: { '👏': 10, '⭐': 4 } },
        { sender: 'Sunni Chatterjee', senderRole: 'employee', recipient: 'Elias Voss', value: 'Unblocker', message: 'Paired with me for two hours on a gnarly race condition. Found it in 20 minutes. I learned more than I would have in a week.', points: 30, time: '4d ago', type: 'public', reactions: { '🔥': 8, '❤️': 5 } },
      ],
      emptyState: "No shipped kudos yet. Who unblocked someone this week?",
    },
    hospitality: {
      name: 'Hospitality',
      icon: '🍽️',
      org: 'The Laurel House',
      orgTagline: 'Boutique hotel group · Quebec',
      values: [
        { id: 'guest', name: 'Guest Delight', icon: '✦', points: 50 },
        { id: 'crew', name: 'Back of House', icon: '🤝', points: 30 },
        { id: 'detail', name: 'Quiet Detail', icon: '🕯️', points: 40 },
        { id: 'service', name: 'Service Poise', icon: '🍷', points: 40 },
        { id: 'save', name: 'Guest Save', icon: '💛', points: 50 },
      ],
      sampleRecs: [
        { sender: 'Céline Dubois', senderRole: 'manager', recipient: 'Rashid Al-Farouq', value: 'Guest Save', message: "A couple's anniversary dinner fell apart — wrong allergy on the kitchen card. Rashid rebuilt the whole tasting menu in fifteen minutes. They left writing a review before they'd taken their coats off.", points: 50, time: '1h ago', type: 'public', reactions: { '❤️': 19, '👏': 12, '🍷': 6 } },
        { sender: 'Milo Arvedsen', senderRole: 'employee', recipient: 'Joséphine Laurent', value: 'Quiet Detail', message: "She noticed the regular hadn't ordered his usual and quietly set it up for him anyway. He teared up a little. That's the job, done right.", points: 40, time: '3h ago', type: 'spotlight', reactions: { '❤️': 16, '⭐': 7 } },
        { sender: 'Amara Adeyemi', senderRole: 'admin', recipient: 'Gus Hollander', value: 'Service Poise', message: 'Two years at Laurel, never flustered, never raised his voice. Room charge never wrong. Promoted to floor captain effective today.', points: 100, time: '2d ago', type: 'milestone', reactions: { '🎉': 22, '❤️': 11, '🍷': 8 } },
        { sender: 'Tamar Kostas', senderRole: 'employee', recipient: 'Ingrid Moreau', value: 'Back of House', message: "Saw pastry was drowning and jumped on the dish pit without anyone asking. Service didn't skip a beat.", points: 30, time: '3d ago', type: 'public', reactions: { '👏': 9, '❤️': 4 } },
      ],
      emptyState: "The feed is empty. Who made a guest's night last shift?",
    },
    financial: {
      name: 'Financial Services',
      icon: '💠',
      org: 'Crane & Sons Advisory',
      orgTagline: 'Wealth management · Toronto',
      values: [
        { id: 'client', name: 'Client Excellence', icon: '✦', points: 50 },
        { id: 'careful', name: 'Careful Work', icon: '📐', points: 40 },
        { id: 'teach', name: 'Teach Up', icon: '📖', points: 30 },
        { id: 'trust', name: 'Earn Trust', icon: '🤝', points: 40 },
        { id: 'integrity', name: 'Quiet Integrity', icon: '💠', points: 50 },
      ],
      sampleRecs: [
        { sender: 'Eleanor Mainwaring', senderRole: 'manager', recipient: 'Caleb Osei', value: 'Client Excellence', message: "A client's spouse passed. Caleb rewrote the entire plan over a weekend so the family meeting on Monday would feel calm. That's what we do here.", points: 50, time: '2h ago', type: 'public', reactions: { '❤️': 17, '👏': 8 } },
        { sender: 'Henrik Sørensen', senderRole: 'employee', recipient: 'Priya Venkataraman', value: 'Careful Work', message: "Caught the typo on the estate filing that would have cost a family six figures. That's a whole career's worth in one morning.", points: 40, time: '5h ago', type: 'spotlight', reactions: { '👏': 24, '⭐': 11, '🔥': 4 } },
        { sender: 'Magnolia Crane', senderRole: 'admin', recipient: 'Desmond Blair', value: 'Quiet Integrity', message: 'Fifteen years. Not one complaint, not one flinch. The firm is what it is because of people like Des.', points: 100, time: '1d ago', type: 'milestone', reactions: { '🎉': 31, '❤️': 19, '⭐': 12 } },
      ],
      emptyState: "No recognitions yet. Who went the extra mile for a client this week?",
    },
  },
  CURRENT_USER: {
    name: 'You',
    displayName: 'Alex Thibodeau',
    role: 'manager',
    title: 'Senior Manager',
    points: 1340,
    initials: 'AT',
  },
  LEADERBOARD: [
    { name: 'Marcus Chen', role: 'employee', title: 'Senior Analyst', points: 1840, change: 2, topValue: 'Patient First' },
    { name: 'Sofia Alvarez', role: 'manager', title: 'Floor Lead', points: 1620, change: 0, topValue: 'Safety First' },
    { name: 'Devon Park', role: 'employee', title: 'Staff Specialist', points: 1480, change: 1, topValue: 'Clinical Excellence' },
    { name: 'Emma Lindqvist', role: 'employee', title: 'Care Coordinator', points: 1290, change: -1, topValue: 'Compassion' },
    { name: 'Leila Haddad', role: 'employee', title: 'Technician', points: 1120, change: 3, topValue: 'Team Lift' },
    { name: 'Chris Novak', role: 'manager', title: 'Shift Lead', points: 980, change: 0, topValue: 'Team Lift' },
    { name: 'Kai Patel', role: 'employee', title: 'Engineer', points: 910, change: -2, topValue: 'Craft' },
    { name: 'Amélie Tremblay', role: 'admin', title: 'Director', points: 880, change: 1, topValue: 'Leadership' },
    { name: 'Priya Deshmukh', role: 'manager', title: 'Lead', points: 810, change: 0, topValue: 'Team Lift' },
    { name: 'Sana Al-Rashid', role: 'employee', title: 'Specialist', points: 760, change: 4, topValue: 'Service' },
    { name: 'Theo Blackwood', role: 'employee', title: 'Analyst', points: 720, change: -1, topValue: 'Craft' },
    { name: 'Maya Iyer', role: 'employee', title: 'Coordinator', points: 680, change: 2, topValue: 'Team Lift' },
  ],
  REWARDS: [
    { title: 'Indigo Gift Card', brand: 'Indigo', icon: '📚', denom: 'CA$25', points: 500, color: '#7C2D2D' },
    { title: 'Roots Gift Card', brand: 'Roots', icon: '🍂', denom: 'CA$50', points: 1000, color: '#2C5F4A' },
    { title: 'Tim Hortons Card', brand: 'Tim Hortons', icon: '☕', denom: 'CA$15', points: 300, color: '#C2282C' },
    { title: 'SAIL Gift Card', brand: 'SAIL', icon: '⛵', denom: 'CA$75', points: 1500, color: '#1B3A4B' },
    { title: 'Loblaws Gift Card', brand: 'Loblaws', icon: '🛒', denom: 'CA$25', points: 500, color: '#E8161B' },
    { title: 'Canadian Tire Card', brand: 'Canadian Tire', icon: '🔧', denom: 'CA$50', points: 1000, color: '#C8102E' },
    { title: 'LCBO Gift Card', brand: 'LCBO', icon: '🍷', denom: 'CA$50', points: 1000, color: '#6B2737' },
    { title: 'Apple Gift Card', brand: 'Apple', icon: '🍎', denom: 'CA$100', points: 2000, color: '#1A1A1A' },
    { title: 'Amazon Gift Card', brand: 'Amazon', icon: '📦', denom: 'CA$25', points: 500, color: '#232F3E' },
    { title: 'Cineplex Tickets', brand: 'Cineplex', icon: '🎬', denom: '2 tickets', points: 800, color: '#1B365D' },
    { title: 'Sephora Gift Card', brand: 'Sephora', icon: '💄', denom: 'CA$50', points: 1000, color: '#1A1A1A' },
    { title: 'Donate: SickKids', brand: 'SickKids', icon: '♡', denom: 'CA$25', points: 500, color: '#E4002B' },
  ],
  BADGES: [
    { id: 'first', name: 'First Recognition', icon: '✦', category: 'Milestones', earned: true, date: 'Feb 2026', criteria: 'Send your first recognition' },
    { id: 'kindweek', name: 'Kindness Week', icon: '💛', category: 'Seasonal', earned: true, date: 'Mar 2026', criteria: 'Recognise 5 teammates in a week' },
    { id: 'mentor', name: 'Mentor', icon: '📖', category: 'Leadership', earned: true, date: 'Jan 2026', criteria: 'Onboard a new teammate' },
    { id: 'streak10', name: '10-Day Streak', icon: '🔥', category: 'Consistency', earned: true, date: 'Apr 2026', criteria: 'Recognise someone 10 days in a row' },
    { id: 'team100', name: '100 Recognitions', icon: '🎉', category: 'Milestones', earned: true, date: 'Mar 2026', criteria: 'Team hits 100 recognitions this month' },
    { id: 'night', name: 'Night Shift', icon: '🌙', category: 'Industry', earned: true, date: 'Feb 2026', criteria: 'Recognise a night-shift teammate' },
    { id: 'anchor', name: 'Team Anchor', icon: '⚓', category: 'Leadership', earned: false, criteria: 'Receive 20+ recognitions for Team values' },
    { id: 'founders', name: "Founder's Circle", icon: '✶', category: 'Milestones', earned: false, criteria: 'First 50 people on your team to join Bryte' },
    { id: 'globetrot', name: 'Globetrotter', icon: '🌍', category: 'Seasonal', earned: false, criteria: 'Recognise someone in 3+ locations' },
    { id: 'craft', name: 'Craft Master', icon: '⚒️', category: 'Industry', earned: false, criteria: 'Receive 10 Craft-value recognitions' },
    { id: 'lift', name: 'Heavy Lifter', icon: '💪', category: 'Consistency', earned: false, criteria: 'Give 30+ recognitions in a quarter' },
    { id: 'champion', name: 'Q1 Champion', icon: '🏆', category: 'Milestones', earned: false, criteria: 'Top 10 on leaderboard for a full quarter' },
  ],
  NOMINEES: [
    { name: 'Marcus Chen', role: 'employee', title: 'Senior Analyst', votes: 24, quote: 'Every patient feels seen.' },
    { name: 'Sofia Alvarez', role: 'manager', title: 'Floor Lead', votes: 19, quote: 'Steady leader. Quiet force.' },
    { name: 'Devon Park', role: 'employee', title: 'Staff Specialist', votes: 16, quote: 'A decade of excellence.' },
    { name: 'Emma Lindqvist', role: 'employee', title: 'Care Coordinator', votes: 12, quote: 'The voice families remember.' },
  ],
  ANNIVERSARIES: [
    { name: 'Devon Park', years: 10, date: 'Today', tenure: '2016' },
    { name: 'Amélie Tremblay', years: 5, date: 'Tomorrow', tenure: '2021' },
    { name: 'Chris Novak', years: 3, date: 'Apr 24', tenure: '2023' },
    { name: 'Emma Lindqvist', years: 1, date: 'Apr 26', tenure: '2025' },
  ],
  NOTIFICATIONS: [
    { id: 'n1', kind: 'recognition', actor: 'Priya Deshmukh', actorRole: 'employee', text: 'recognised you for Patient First', time: '12m ago', unread: true, value: 'Patient First' },
    { id: 'n2', kind: 'reaction', actor: 'Sofia Alvarez', actorRole: 'manager', text: 'reacted 🙌 to your recognition of Devon', time: '1h ago', unread: true, emoji: '🙌' },
    { id: 'n3', kind: 'comment', actor: 'Marcus Chen', actorRole: 'employee', text: 'replied on your thread', time: '3h ago', unread: true, snippet: 'Means a lot — thank you.' },
    { id: 'n4', kind: 'badge', actor: 'System', text: 'You earned the Team Anchor badge', time: 'Yesterday', unread: false, badge: 'Team Anchor', icon: '⚓' },
    { id: 'n5', kind: 'nomination', actor: 'Emma Lindqvist', actorRole: 'employee', text: 'nominated you for the Craft Master badge', time: 'Yesterday', unread: false, badge: 'Craft Master' },
    { id: 'n6', kind: 'approval', actor: 'System', text: 'Your CA$200 gift card is approved', time: '2 days ago', unread: false },
    { id: 'n7', kind: 'anniversary', actor: 'System', text: "Devon Park's 10-year is today — send a note?", time: '2 days ago', unread: false },
    { id: 'n8', kind: 'recognition', actor: 'Chris Novak', actorRole: 'employee', text: 'recognised you for Team Lift', time: '3 days ago', unread: false, value: 'Team Lift' },
  ],
  APPROVAL_QUEUE: [
    { id: 'a1', requester: 'Marcus Chen', reward: 'CA$200 gift card', points: 2000, requested: '2 hours ago', status: 'pending', reason: '' },
    { id: 'a2', requester: 'Emma Lindqvist', reward: 'Extra PTO day', points: 3000, requested: 'Yesterday', status: 'pending', reason: 'Planning a long weekend' },
    { id: 'a3', requester: 'Devon Park', reward: 'Lunch with the CEO', points: 2500, requested: 'Yesterday', status: 'pending', reason: '' },
    { id: 'a4', requester: 'Chris Novak', reward: 'Charity match · CA$100', points: 2000, requested: '2 days ago', status: 'approved', reason: 'Going to SickKids' },
    { id: 'a5', requester: 'Sofia Alvarez', reward: 'Learning stipend · CA$200', points: 4000, requested: '3 days ago', status: 'approved', reason: 'Project Management cert' },
  ],
  ORG_TREE: {
    name: 'Dr. James Morrison',
    role: 'manager',
    title: 'Chief of Staff',
    tenure: '12y',
    points: 8400,
    reports: [
      {
        name: 'Alex Thibodeau', role: 'manager', title: 'Senior Manager · You', tenure: '2y', points: 2450, isMe: true,
        reports: [
          { name: 'Marcus Chen', role: 'employee', title: 'Senior Analyst', tenure: '4y', points: 1920, reports: [] },
          { name: 'Priya Deshmukh', role: 'employee', title: 'Care Coordinator', tenure: '3y', points: 1680, reports: [] },
          { name: 'Emma Lindqvist', role: 'employee', title: 'Care Coordinator', tenure: '1y', points: 920, reports: [] },
          { name: 'Chris Novak', role: 'employee', title: 'Staff Nurse', tenure: '3y', points: 1440, reports: [] },
        ],
      },
      {
        name: 'Sofia Alvarez', role: 'manager', title: 'Floor Lead', tenure: '6y', points: 3100, reports: [
          { name: 'Devon Park', role: 'employee', title: 'Staff Specialist', tenure: '10y', points: 2680, reports: [] },
          { name: 'Amélie Tremblay', role: 'employee', title: 'Nurse', tenure: '5y', points: 1560, reports: [] },
        ],
      },
    ],
  },
  SAMPLE_COMMENTS: [
    { author: 'Marcus Chen', role: 'employee', text: 'Means a lot. Thank you for the note, Priya.', time: '1h ago' },
    { author: 'Sofia Alvarez', role: 'manager', text: 'Seconded — saw it happen. Mrs. Okafor was so grateful.', time: '45m ago' },
    { author: 'Emma Lindqvist', role: 'employee', text: 'This is why I love working here ❤️', time: '20m ago' },
  ],
  TEMPLATES: [
    { cat: 'New hire', title: 'Welcome to the team', body: 'Your first week has been a bright spot. The way you jumped in with curiosity — on day three! — tells me we picked well. Welcome.' },
    { cat: 'New hire', title: 'First win', body: "Watching you nail your first [X] was something. You asked good questions, stayed calm, delivered. That's rare and I noticed." },
    { cat: 'Project wrap', title: 'Project thank-you', body: "Couldn't have shipped [project] without you. Specifically: [the thing]. That's the kind of work that pulls a whole team forward." },
    { cat: 'Project wrap', title: 'Launch win', body: "We launched. You stayed past 6pm three nights this week making sure of it. I see you. Thank you." },
    { cat: 'Tough week', title: 'Grace under pressure', body: "This week was hard. You kept your head, kept the team's head, kept going. That's leadership — whatever your title says." },
    { cat: 'Tough week', title: 'Quiet thanks', body: "Sometimes the most important work doesn't make a sound. Yours did this week. Thank you for carrying what you carried." },
    { cat: 'Milestone', title: 'Anniversary', body: "Happy [N] years. The person you were when you started and the one I work with now — what a privilege to have watched that." },
    { cat: 'Everyday', title: 'Small moment', body: "Saw what you did with [teammate/customer]. A small moment. The kind that makes this place feel like a good place. Thank you." },
    { cat: 'Everyday', title: 'Above and beyond', body: "You didn't have to do that. You did it anyway. That's who you are, and it matters more than I think I say." },
  ],
  CUSTOM_REWARDS: [
    { title: 'Lunch with the CEO', points: 2500, icon: '🥂', color: '#C2882D', kind: 'experience', desc: 'One-on-one lunch on us. Anywhere in the city.' },
    { title: 'Extra PTO day', points: 3000, icon: '🌴', color: '#2C5F4A', kind: 'experience', desc: 'One free day, anytime, no approvals needed.' },
    { title: 'Charity match · CA$100', points: 2000, icon: '♡', color: '#D05A3B', kind: 'donate', desc: 'We match your pick: SickKids, CMHA, Food Banks Canada.' },
    { title: 'Learning stipend · CA$200', points: 4000, icon: '📖', color: '#1B3A4B', kind: 'experience', desc: 'For a course, book, or conference of your choice.' },
    { title: 'Plant a tree in your name', points: 800, icon: '🌲', color: '#2C5F4A', kind: 'donate', desc: 'One Tree Planted · certificate mailed to your home.' },
    { title: 'Headphones-on Friday', points: 1500, icon: '🎧', color: '#6B2737', kind: 'experience', desc: "A full day of zero meetings. We'll block it off." },
  ],
  INTEGRATIONS: [
    { name: 'Workday', color: '#F14E1C', connected: false, desc: 'Auto-import your org chart and sync new hires. Enterprise plan only.' },
    { name: 'ADP', color: '#E31837', connected: false, desc: 'Sync payroll data, employee records and org hierarchy. Enterprise plan only.' },
    { name: 'HRIS Sync', color: '#2C5F4A', connected: false, desc: 'Generic SCIM bridge for BambooHR, Rippling, and more.' },
    { name: 'Zapier', color: '#FF4A00', connected: false, desc: 'Connect to 5,000+ apps. Trigger recognitions from any workflow.' },
  ],
};
