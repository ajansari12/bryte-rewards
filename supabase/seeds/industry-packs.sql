/*
  Industry Pack Seeds
  -------------------
  Translates BRYTE_DATA industry packs into stable seed rows.
  All rows use fixed UUIDs so this file is idempotent (ON CONFLICT DO NOTHING).
  These are shared demo orgs — each new real signup creates its own org and
  copies the relevant pack's values + badges at onboarding time.

  Covers:
    - 6 organizations (one per industry)
    - Values for each org (4–5 per pack)
    - 12 badge definitions shared across all orgs
    - Sample recognitions for each org (sender/recipient use placeholder UUIDs
      that real users can replace in a dev/test environment)
*/

-- ──────────────────────────────────────────────────
-- Organizations
-- ──────────────────────────────────────────────────
INSERT INTO organizations (id, name, industry, plan, points_pool_remaining) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Mapleview Medical',      'healthcare',   'growth',   120000),
  ('10000000-0000-0000-0000-000000000002', 'Northshore Builders',    'construction', 'growth',   120000),
  ('10000000-0000-0000-0000-000000000003', 'Wilder & Oak',           'retail',       'growth',   120000),
  ('10000000-0000-0000-0000-000000000004', 'Pine Labs',              'technology',   'growth',   120000),
  ('10000000-0000-0000-0000-000000000005', 'The Laurel House',       'hospitality',  'growth',   120000),
  ('10000000-0000-0000-0000-000000000006', 'Crane & Sons Advisory',  'financial',    'growth',   120000)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────
-- Values
-- ──────────────────────────────────────────────────

-- Healthcare
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', 'Patient First',       '🫀', 50, 1),
  ('20000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000001', 'Team Lift',           '🤝', 30, 2),
  ('20000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000001', 'Safety Always',       '🛡️', 40, 3),
  ('20000000-0000-0000-0001-000000000004', '10000000-0000-0000-0000-000000000001', 'Compassion',          '💛', 40, 4),
  ('20000000-0000-0000-0001-000000000005', '10000000-0000-0000-0000-000000000001', 'Clinical Excellence', '✦',  60, 5)
ON CONFLICT (id) DO NOTHING;

-- Construction
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002', 'Safety First',  '🦺', 60, 1),
  ('20000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000002', 'Craft Pride',   '🔨', 40, 2),
  ('20000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000002', 'Crew Loyalty',  '🤝', 30, 3),
  ('20000000-0000-0000-0002-000000000004', '10000000-0000-0000-0000-000000000002', 'On Schedule',   '📐', 40, 4),
  ('20000000-0000-0000-0002-000000000005', '10000000-0000-0000-0000-000000000002', 'Built to Last', '✦',  50, 5)
ON CONFLICT (id) DO NOTHING;

-- Retail
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0003-000000000001', '10000000-0000-0000-0000-000000000003', 'Guest Moments',  '💛', 40, 1),
  ('20000000-0000-0000-0003-000000000002', '10000000-0000-0000-0000-000000000003', 'Floor Ready',    '🛍️', 30, 2),
  ('20000000-0000-0000-0003-000000000003', '10000000-0000-0000-0000-000000000003', 'Shift Together', '🤝', 30, 3),
  ('20000000-0000-0000-0003-000000000004', '10000000-0000-0000-0000-000000000003', 'Storytelling',   '📖', 40, 4),
  ('20000000-0000-0000-0003-000000000005', '10000000-0000-0000-0000-000000000003', 'Above & Beyond', '✦',  50, 5)
ON CONFLICT (id) DO NOTHING;

-- Technology
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0004-000000000001', '10000000-0000-0000-0000-000000000004', 'Ship It',       '🚀', 40, 1),
  ('20000000-0000-0000-0004-000000000002', '10000000-0000-0000-0000-000000000004', 'Unblocker',     '🔓', 30, 2),
  ('20000000-0000-0000-0004-000000000003', '10000000-0000-0000-0000-000000000004', 'Craft',         '✦',  50, 3),
  ('20000000-0000-0000-0004-000000000004', '10000000-0000-0000-0000-000000000004', 'Customer Love', '💛', 40, 4),
  ('20000000-0000-0000-0004-000000000005', '10000000-0000-0000-0000-000000000004', 'Wrote It Down', '📝', 30, 5)
ON CONFLICT (id) DO NOTHING;

-- Hospitality
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0005-000000000001', '10000000-0000-0000-0000-000000000005', 'Guest Delight', '✦',  50, 1),
  ('20000000-0000-0000-0005-000000000002', '10000000-0000-0000-0000-000000000005', 'Back of House', '🤝', 30, 2),
  ('20000000-0000-0000-0005-000000000003', '10000000-0000-0000-0000-000000000005', 'Quiet Detail',  '🕯️', 40, 3),
  ('20000000-0000-0000-0005-000000000004', '10000000-0000-0000-0000-000000000005', 'Service Poise', '🍷', 40, 4),
  ('20000000-0000-0000-0005-000000000005', '10000000-0000-0000-0000-000000000005', 'Guest Save',    '💛', 50, 5)
ON CONFLICT (id) DO NOTHING;

-- Financial
INSERT INTO values (id, org_id, name, icon, points, sort_order) VALUES
  ('20000000-0000-0000-0006-000000000001', '10000000-0000-0000-0000-000000000006', 'Client Excellence', '✦',  50, 1),
  ('20000000-0000-0000-0006-000000000002', '10000000-0000-0000-0000-000000000006', 'Careful Work',      '📐', 40, 2),
  ('20000000-0000-0000-0006-000000000003', '10000000-0000-0000-0000-000000000006', 'Teach Up',          '📖', 30, 3),
  ('20000000-0000-0000-0006-000000000004', '10000000-0000-0000-0000-000000000006', 'Earn Trust',        '🤝', 40, 4),
  ('20000000-0000-0000-0006-000000000005', '10000000-0000-0000-0000-000000000006', 'Quiet Integrity',   '💠', 50, 5)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────
-- Badges (shared definitions per org)
-- Seeded for healthcare org; at onboarding time, the
-- server copies these to the new user's org.
-- ──────────────────────────────────────────────────

-- Healthcare badges
INSERT INTO badges (id, org_id, name, icon, category, criteria, is_seasonal) VALUES
  ('30000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', 'First Recognition', '✦',  'Milestones',  'Send your first recognition',                    false),
  ('30000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000001', 'Kindness Week',     '💛',  'Seasonal',    'Recognise 5 teammates in a week',                true),
  ('30000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000001', 'Mentor',            '📖',  'Leadership',  'Onboard a new teammate',                         false),
  ('30000000-0000-0000-0001-000000000004', '10000000-0000-0000-0000-000000000001', '10-Day Streak',     '🔥',  'Consistency', 'Recognise someone 10 days in a row',             false),
  ('30000000-0000-0000-0001-000000000005', '10000000-0000-0000-0000-000000000001', '100 Recognitions',  '🎉',  'Milestones',  'Team hits 100 recognitions this month',          false),
  ('30000000-0000-0000-0001-000000000006', '10000000-0000-0000-0000-000000000001', 'Night Shift',       '🌙',  'Industry',    'Recognise a night-shift teammate',               false),
  ('30000000-0000-0000-0001-000000000007', '10000000-0000-0000-0000-000000000001', 'Team Anchor',       '⚓',  'Leadership',  'Receive 20+ recognitions for Team values',       false),
  ('30000000-0000-0000-0001-000000000008', '10000000-0000-0000-0000-000000000001', 'Founder''s Circle', '✶',  'Milestones',  'First 50 people on your team to join Bryte',     false),
  ('30000000-0000-0000-0001-000000000009', '10000000-0000-0000-0000-000000000001', 'Globetrotter',      '🌍',  'Seasonal',    'Recognise someone in 3+ locations',              true),
  ('30000000-0000-0000-0001-000000000010', '10000000-0000-0000-0000-000000000001', 'Craft Master',      '⚒️', 'Industry',    'Receive 10 Craft-value recognitions',            false),
  ('30000000-0000-0000-0001-000000000011', '10000000-0000-0000-0000-000000000001', 'Heavy Lifter',      '💪',  'Consistency', 'Give 30+ recognitions in a quarter',             false),
  ('30000000-0000-0000-0001-000000000012', '10000000-0000-0000-0000-000000000001', 'Q1 Champion',       '🏆',  'Milestones',  'Top 10 on leaderboard for a full quarter',       false)
ON CONFLICT (id) DO NOTHING;

-- Construction badges (mirror set with construction industry context)
INSERT INTO badges (id, org_id, name, icon, category, criteria, is_seasonal) VALUES
  ('30000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002', 'First Recognition', '✦',  'Milestones',  'Send your first recognition',                    false),
  ('30000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000002', 'Safety Star',       '🦺',  'Industry',    'Recognised for Safety First 5 times',            false),
  ('30000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000003', 'Mentor',            '📖',  'Leadership',  'Onboard a new teammate',                         false),
  ('30000000-0000-0000-0002-000000000004', '10000000-0000-0000-0000-000000000002', '10-Day Streak',     '🔥',  'Consistency', 'Recognise someone 10 days in a row',             false),
  ('30000000-0000-0000-0002-000000000005', '10000000-0000-0000-0000-000000000002', 'Crew Champion',     '🏆',  'Milestones',  'Top 10 on leaderboard for a full quarter',       false),
  ('30000000-0000-0000-0002-000000000006', '10000000-0000-0000-0000-000000000002', 'Craft Master',      '⚒️', 'Industry',    'Receive 10 Craft Pride recognitions',            false),
  ('30000000-0000-0000-0002-000000000007', '10000000-0000-0000-0000-000000000002', 'Heavy Lifter',      '💪',  'Consistency', 'Give 30+ recognitions in a quarter',             false),
  ('30000000-0000-0000-0002-000000000008', '10000000-0000-0000-0000-000000000002', 'Founder''s Circle', '✶',  'Milestones',  'First 50 people on your team to join Bryte',     false)
ON CONFLICT (id) DO NOTHING;

-- Technology badges
INSERT INTO badges (id, org_id, name, icon, category, criteria, is_seasonal) VALUES
  ('30000000-0000-0000-0004-000000000001', '10000000-0000-0000-0000-000000000004', 'First Recognition', '✦',  'Milestones',  'Send your first recognition',                    false),
  ('30000000-0000-0000-0004-000000000002', '10000000-0000-0000-0000-000000000004', 'Ship Streak',       '🚀',  'Consistency', 'Recognise a teammate for Ship It 5 times',       false),
  ('30000000-0000-0000-0004-000000000003', '10000000-0000-0000-0000-000000000004', 'Unblocker',         '🔓',  'Industry',    'Receive 10 Unblocker recognitions',              false),
  ('30000000-0000-0000-0004-000000000004', '10000000-0000-0000-0000-000000000004', '10-Day Streak',     '🔥',  'Consistency', 'Recognise someone 10 days in a row',             false),
  ('30000000-0000-0000-0004-000000000005', '10000000-0000-0000-0000-000000000004', 'Craft Master',      '⚒️', 'Industry',    'Receive 10 Craft-value recognitions',            false),
  ('30000000-0000-0000-0004-000000000006', '10000000-0000-0000-0000-000000000004', 'Q1 Champion',       '🏆',  'Milestones',  'Top 10 on leaderboard for a full quarter',       false),
  ('30000000-0000-0000-0004-000000000007', '10000000-0000-0000-0000-000000000004', 'Heavy Lifter',      '💪',  'Consistency', 'Give 30+ recognitions in a quarter',             false),
  ('30000000-0000-0000-0004-000000000008', '10000000-0000-0000-0000-000000000004', 'Founder''s Circle', '✶',  'Milestones',  'First 50 people on your team to join Bryte',     false)
ON CONFLICT (id) DO NOTHING;
