/*
  # Recognition notifications, fulfillment codes, quarterly pool

  1. New Columns
    - `redemptions.fulfillment_code` (text, nullable) — stores the redeemable
      code emitted by the fulfill-redemption edge function so admins can
      re-send or users can self-serve.
    - `organizations.quarterly_pool` (integer, default 24000) — per-quarter
      recognition budget surfaced in the admin Budget panel. Distinct from
      `points_pool_remaining` which is the total available balance.

  2. New Trigger Function
    - `notify_on_recognition_insert()` — AFTER INSERT on `recognitions`.
      Creates `notifications` rows for the recipient (`kind='recognition'`)
      and the recipient's manager (`kind='team_recognition'`), respecting
      `notification_prefs.in_app`. Mirrors the logic in the
      `on-recognition-insert` edge function so in-app notifications fire
      without a Database Webhook being registered.

  3. Security
    - Trigger function runs as SECURITY DEFINER so RLS on `notifications`
      does not block automated inserts. Pinned `search_path = public`.

  ## Notes
    1. The edge function is still available for external webhook setups but
       is no longer required for in-app notifications to work.
    2. `fulfillment_code` is only populated by the fulfill-redemption edge
       function; leaving NULL means the redemption has not been fulfilled.
*/

-- 1. redemptions.fulfillment_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redemptions' AND column_name = 'fulfillment_code'
  ) THEN
    ALTER TABLE redemptions ADD COLUMN fulfillment_code text;
  END IF;
END $$;

-- 2. organizations.quarterly_pool
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'quarterly_pool'
  ) THEN
    ALTER TABLE organizations ADD COLUMN quarterly_pool integer NOT NULL DEFAULT 24000;
  END IF;
END $$;

-- 3. recognition insert → in-app notifications
CREATE OR REPLACE FUNCTION notify_on_recognition_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name    text;
  v_recipient_name text;
  v_manager_id     uuid;
  v_recipient_prefs jsonb;
  v_manager_prefs   jsonb;
  v_value_name     text;
  v_snippet        text;
  v_payload        jsonb;
BEGIN
  IF NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name FROM users WHERE id = NEW.sender_id;
  SELECT display_name, manager_id, notification_prefs
    INTO v_recipient_name, v_manager_id, v_recipient_prefs
    FROM users WHERE id = NEW.recipient_id;

  IF NEW.value_id IS NOT NULL THEN
    SELECT name INTO v_value_name FROM values WHERE id = NEW.value_id;
  END IF;

  v_snippet := CASE
    WHEN NEW.message IS NULL THEN ''
    WHEN length(NEW.message) > 100 THEN left(NEW.message, 100) || '…'
    ELSE NEW.message
  END;

  v_payload := jsonb_build_object(
    'recognition_id', NEW.id,
    'org_id', NEW.org_id,
    'sender_name', COALESCE(v_sender_name, 'A teammate'),
    'recipient_name', COALESCE(v_recipient_name, 'your teammate'),
    'value_name', v_value_name,
    'message_snippet', v_snippet,
    'points', NEW.points
  );

  -- Notify recipient unless they opted out of in-app
  IF NEW.recipient_id <> NEW.sender_id
     AND COALESCE((v_recipient_prefs->>'in_app')::boolean, true) THEN
    INSERT INTO notifications (user_id, kind, payload_json)
    VALUES (NEW.recipient_id, 'recognition', v_payload);
  END IF;

  -- Notify recipient's manager if present, not the sender, and opted in
  IF v_manager_id IS NOT NULL AND v_manager_id <> NEW.sender_id THEN
    SELECT notification_prefs INTO v_manager_prefs FROM users WHERE id = v_manager_id;
    IF COALESCE((v_manager_prefs->>'in_app')::boolean, true) THEN
      INSERT INTO notifications (user_id, kind, payload_json)
      VALUES (v_manager_id, 'team_recognition', v_payload);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recognitions_notify ON recognitions;
CREATE TRIGGER recognitions_notify
AFTER INSERT ON recognitions
FOR EACH ROW EXECUTE FUNCTION notify_on_recognition_insert();
