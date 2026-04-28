/*
  # Demo requests table

  Stores incoming demo booking requests submitted via the marketing site.

  1. New Tables
    - `demo_requests`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `work_email` (text)
      - `company` (text)
      - `team_size` (text) — selected chip label e.g. "11–50"
      - `preferred_date` (date, nullable)
      - `preferred_time` (text, nullable)
      - `message` (text, nullable)
      - `status` (text) — 'new' | 'contacted' | 'booked' | 'closed'
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled; no public read/write
    - INSERT allowed for anonymous callers (public form) — via service role in edge function only
    - SELECT/UPDATE only for service_role (no direct client access)

  3. Notes
    - The edge function uses the service role key, so inserts bypass RLS
    - No user-facing SELECT policy is needed — admins access via Supabase dashboard
*/

CREATE TABLE IF NOT EXISTS demo_requests (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     text        NOT NULL DEFAULT '',
  last_name      text        NOT NULL DEFAULT '',
  work_email     text        NOT NULL,
  company        text        NOT NULL DEFAULT '',
  team_size      text        NOT NULL DEFAULT '',
  preferred_date date,
  preferred_time text,
  message        text,
  status         text        NOT NULL DEFAULT 'new',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- No public policies — all access is via service role key in the edge function
