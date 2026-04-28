/*
  # Values, Recognitions, Reactions, Comments

  1. New Tables
    - `values` — org-specific recognition categories with point weights
    - `recognitions` — peer recognition records
    - `reactions` — emoji reactions on recognitions (composite PK)
    - `comments` — threaded comments on recognitions

  2. Security
    - RLS enabled on all four tables
    - All tables scoped to the user's org via get_my_org_id()
    - Reactions/comments scoped via join to recognitions
*/

CREATE TABLE IF NOT EXISTS values (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name       text NOT NULL,
  icon       text NOT NULL DEFAULT '✦',
  points     int  NOT NULL DEFAULT 30,
  sort_order int  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS values_org_id_idx ON values (org_id);

CREATE TABLE IF NOT EXISTS recognitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  value_id     uuid REFERENCES values ON DELETE SET NULL,
  message      text NOT NULL DEFAULT '',
  points       int  NOT NULL DEFAULT 0,
  type         text NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'milestone', 'spotlight')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recognitions_org_id_idx       ON recognitions (org_id);
CREATE INDEX IF NOT EXISTS recognitions_recipient_id_idx ON recognitions (recipient_id);
CREATE INDEX IF NOT EXISTS recognitions_sender_id_idx    ON recognitions (sender_id);
CREATE INDEX IF NOT EXISTS recognitions_created_at_idx   ON recognitions (created_at DESC);

CREATE TABLE IF NOT EXISTS reactions (
  recognition_id uuid NOT NULL REFERENCES recognitions ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  emoji          text NOT NULL,
  PRIMARY KEY (recognition_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recognition_id uuid NOT NULL REFERENCES recognitions ON DELETE CASCADE,
  author_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  body           text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_recognition_id_idx ON comments (recognition_id);

-- ─── RLS ───────────────────────────────────────────────

ALTER TABLE values       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments     ENABLE ROW LEVEL SECURITY;

-- Values
CREATE POLICY "Org members can read values"
  ON values FOR SELECT TO authenticated
  USING (org_id = get_my_org_id());

CREATE POLICY "Admins and managers can insert values"
  ON values FOR INSERT TO authenticated
  WITH CHECK (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('manager','admin')
  ));

CREATE POLICY "Admins and managers can update values"
  ON values FOR UPDATE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('manager','admin')
  ))
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE TO authenticated
  USING (org_id = get_my_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Recognitions: readable if public OR sender/recipient
CREATE POLICY "Org members can read public recognitions"
  ON recognitions FOR SELECT TO authenticated
  USING (
    org_id = get_my_org_id() AND (
      type != 'private'
      OR sender_id    = auth.uid()
      OR recipient_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert recognitions"
  ON recognitions FOR INSERT TO authenticated
  WITH CHECK (
    org_id    = get_my_org_id() AND
    sender_id = auth.uid()
  );

-- Reactions: scoped via recognition's org
CREATE POLICY "Org members can read reactions"
  ON reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recognitions r
      WHERE r.id = reactions.recognition_id
        AND r.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Users can insert own reactions"
  ON reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM recognitions r
      WHERE r.id = reactions.recognition_id
        AND r.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM recognitions r
      WHERE r.id = reactions.recognition_id
        AND r.org_id = get_my_org_id()
    )
  );

-- Comments
CREATE POLICY "Org members can read comments"
  ON comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recognitions r
      WHERE r.id = comments.recognition_id
        AND r.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Authenticated users can post comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM recognitions r
      WHERE r.id = comments.recognition_id
        AND r.org_id = get_my_org_id()
    )
  );

CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());
