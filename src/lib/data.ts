interface Industry {
  name: string;
  icon: string;
  org: string;
  orgTagline: string;
  values: { id: string; name: string; icon: string; points: number }[];
}

interface BryteData {
  INDUSTRIES: Record<string, Industry>;
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
    },
  },
};
