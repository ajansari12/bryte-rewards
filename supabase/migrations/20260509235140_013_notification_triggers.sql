/*
  # Notification Triggers

  Automates creation of `notifications` rows when interactive events happen:

  1. Reactions — notify the recognition recipient when someone reacts, unless
     the reactor is the recipient themselves.
  2. Comments — notify both the recognition sender and recipient (excluding
     the commenter) when a new comment is posted.
  3. Nomination status — notify the nominee when their nomination is approved
     or rejected.
  4. Redemption status — notify the redeeming user on approval/fulfillment.

  All triggers are SECURITY DEFINER so RLS on notifications doesn't block
  automated inserts. Payload includes the minimal fields the UI renders.
*/

-- Reaction → recipient notification
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_actor_name   text;
BEGIN
  SELECT recipient_id INTO v_recipient_id
  FROM recognitions WHERE id = NEW.recognition_id;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_actor_name FROM users WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, kind, payload_json)
  VALUES (
    v_recipient_id,
    'reaction',
    jsonb_build_object(
      'sender_name', v_actor_name,
      'emoji', NEW.emoji,
      'recognition_id', NEW.recognition_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reactions_notify ON reactions;
CREATE TRIGGER reactions_notify
AFTER INSERT ON reactions
FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- Comment → sender + recipient notification
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id    uuid;
  v_recipient_id uuid;
  v_actor_name   text;
  v_snippet      text;
BEGIN
  SELECT sender_id, recipient_id INTO v_sender_id, v_recipient_id
  FROM recognitions WHERE id = NEW.recognition_id;

  SELECT display_name INTO v_actor_name FROM users WHERE id = NEW.author_id;
  v_snippet := left(NEW.body, 80);

  IF v_recipient_id IS NOT NULL AND v_recipient_id <> NEW.author_id THEN
    INSERT INTO notifications (user_id, kind, payload_json)
    VALUES (
      v_recipient_id,
      'comment',
      jsonb_build_object(
        'sender_name', v_actor_name,
        'message_snippet', v_snippet,
        'recognition_id', NEW.recognition_id
      )
    );
  END IF;

  IF v_sender_id IS NOT NULL AND v_sender_id <> NEW.author_id AND v_sender_id <> v_recipient_id THEN
    INSERT INTO notifications (user_id, kind, payload_json)
    VALUES (
      v_sender_id,
      'comment',
      jsonb_build_object(
        'sender_name', v_actor_name,
        'message_snippet', v_snippet,
        'recognition_id', NEW.recognition_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_notify ON comments;
CREATE TRIGGER comments_notify
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Nomination status change → nominee notification
CREATE OR REPLACE FUNCTION notify_on_nomination_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_name text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = OLD.status OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_badge_name FROM badges WHERE id = NEW.badge_id;

  INSERT INTO notifications (user_id, kind, payload_json)
  VALUES (
    NEW.nominee_id,
    'badge',
    jsonb_build_object(
      'badge_name', v_badge_name,
      'status', NEW.status,
      'nomination_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nominations_notify ON nominations;
CREATE TRIGGER nominations_notify
AFTER UPDATE ON nominations
FOR EACH ROW EXECUTE FUNCTION notify_on_nomination_status();

-- Redemption status change → user notification
CREATE OR REPLACE FUNCTION notify_on_redemption_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_title text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_reward_title FROM rewards WHERE id = NEW.reward_id;

  INSERT INTO notifications (user_id, kind, payload_json)
  VALUES (
    NEW.user_id,
    'approval',
    jsonb_build_object(
      'reward_title', v_reward_title,
      'status', NEW.status,
      'redemption_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redemptions_notify ON redemptions;
CREATE TRIGGER redemptions_notify
AFTER UPDATE ON redemptions
FOR EACH ROW EXECUTE FUNCTION notify_on_redemption_status();
