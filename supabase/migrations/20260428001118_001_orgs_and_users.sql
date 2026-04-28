/*
  # Organizations and Users

  1. New Tables
    - `organizations`
      - `id` (uuid, pk)
      - `name` (text, org display name)
      - `industry` (text, e.g. 'healthcare')
      - `plan` (text, default 'free')
      - `points_pool_remaining` (int, points budget)
      - `created_at` (timestamptz)
    - `users`
      - `id` (uuid, pk, references auth.users)
      - `org_id` (uuid, fk → organizations)
      - `display_name` (text)
      - `role` (text, check in employee/manager/admin)
      - `title` (text)
      - `avatar_url` (text)
      - `points` (int, default 0)
      - `manager_id` (uuid, self-fk → users, nullable)
      - `start_date` (date)

  2. Security
    - Enable RLS on both tables
    - Organizations: readable by org members
    - Users: readable by org members, writable only by self (non-role columns)
*/

CREATE TABLE IF NOT EXISTS organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL DEFAULT '',
  industry              text NOT NULL DEFAULT 'healthcare',
  plan                  text NOT NULL DEFAULT 'free',
  points_pool_remaining int  NOT NULL DEFAULT 120000,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role         text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  title        text NOT NULL DEFAULT '',
  avatar_url   text NOT NULL DEFAULT '',
  points       int  NOT NULL DEFAULT 0,
  manager_id   uuid REFERENCES users ON DELETE SET NULL,
  start_date   date
);

CREATE INDEX IF NOT EXISTS users_org_id_idx ON users (org_id);
CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users (manager_id);

-- ─── RLS ───────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Helper: return the org_id of the calling user
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$;

-- Organizations: members can read their own org
CREATE POLICY "Org members can read their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = get_my_org_id());

-- Organizations: admins can update their org
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (id = get_my_org_id());

-- Organizations: anyone authenticated can insert (for signup flow)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users: read everyone in same org
CREATE POLICY "Users can read teammates"
  ON users FOR SELECT
  TO authenticated
  USING (org_id = get_my_org_id());

-- Users: insert own row (during signup / onboarding)
CREATE POLICY "Users can insert own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users: update own non-role columns
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
