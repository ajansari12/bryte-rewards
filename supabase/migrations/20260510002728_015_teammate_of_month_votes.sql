/*
  # Teammate of the Month Votes

  1. New Tables
    - `teammate_of_month_votes` — one row per voter per month; stores who a user
      voted for in a given YYYY-MM period. Unique on (org_id, voter_id, period).

  2. Security
    - RLS enabled
    - Org members can read org votes (for counts)
    - Users can insert/update/delete only their own vote
*/

CREATE TABLE IF NOT EXISTS teammate_of_month_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  voter_id   uuid NOT NULL REFERENCES users         ON DELETE CASCADE,
  nominee_id uuid NOT NULL REFERENCES users         ON DELETE CASCADE,
  period     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, voter_id, period)
);

CREATE INDEX IF NOT EXISTS tom_votes_org_period_idx
  ON teammate_of_month_votes (org_id, period);

ALTER TABLE teammate_of_month_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read monthly votes"
  ON teammate_of_month_votes FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Users can cast own vote"
  ON teammate_of_month_votes FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND voter_id = auth.uid());

CREATE POLICY "Users can change own vote"
  ON teammate_of_month_votes FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND voter_id = auth.uid())
  WITH CHECK (org_id = get_my_org_id() AND voter_id = auth.uid());

CREATE POLICY "Users can remove own vote"
  ON teammate_of_month_votes FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND voter_id = auth.uid());
