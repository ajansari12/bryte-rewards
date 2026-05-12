/*
  # Notify admins on new redemption / nomination requests

  1. New triggers
    - `redemptions_notify_admins_insert` — on every new redemption row, inserts
      a `redemption_requested` notification for every admin in the same org so
      approvers can react quickly from the bell.
    - `nominations_notify_admins_insert` — on every new nomination with
      `status = 'pending'`, notifies managers and admins in the org that a
      review is waiting.
  2. Notes
    1. Triggers are SECURITY DEFINER with search_path pinned so RLS on
       `notifications` does not block automated inserts.
    2. The existing `redemptions_notify` / `nominations_notify` triggers keep
       firing on UPDATE to notify the user of status changes.
    3. Payload includes reward/badge title + a reference id so clients can
       deep-link into the approval queue.
*/

CREATE OR REPLACE FUNCTION notify_admins_on_redemption_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id       uuid;
  v_reward_title text;
  v_actor_name   text;
  v_admin_id     uuid;
BEGIN
  SELECT org_id, display_name INTO v_org_id, v_actor_name
  FROM users WHERE id = NEW.user_id;

  SELECT title INTO v_reward_title FROM rewards WHERE id = NEW.reward_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_admin_id IN
    SELECT id FROM users
    WHERE org_id = v_org_id AND role = 'admin' AND id <> NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, kind, payload_json)
    VALUES (
      v_admin_id,
      'redemption_requested',
      jsonb_build_object(
        'sender_name', v_actor_name,
        'reward_title', v_reward_title,
        'points_spent', NEW.points_spent,
        'redemption_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redemptions_notify_admins_insert ON redemptions;
CREATE TRIGGER redemptions_notify_admins_insert
AFTER INSERT ON redemptions
FOR EACH ROW EXECUTE FUNCTION notify_admins_on_redemption_insert();

CREATE OR REPLACE FUNCTION notify_reviewers_on_nomination_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     uuid;
  v_badge_name text;
  v_nominee    text;
  v_reviewer   uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT org_id INTO v_org_id FROM users WHERE id = NEW.nominator_id;
  SELECT name INTO v_badge_name FROM badges WHERE id = NEW.badge_id;
  SELECT display_name INTO v_nominee FROM users WHERE id = NEW.nominee_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_reviewer IN
    SELECT id FROM users
    WHERE org_id = v_org_id AND role IN ('admin','manager')
      AND id <> NEW.nominator_id
  LOOP
    INSERT INTO notifications (user_id, kind, payload_json)
    VALUES (
      v_reviewer,
      'nomination_pending',
      jsonb_build_object(
        'nominee_name', v_nominee,
        'badge_name', v_badge_name,
        'nomination_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nominations_notify_admins_insert ON nominations;
CREATE TRIGGER nominations_notify_admins_insert
AFTER INSERT ON nominations
FOR EACH ROW EXECUTE FUNCTION notify_reviewers_on_nomination_insert();
