-- ============================================================================
-- Pairing-code brute-force defense: per-window attempts cap + tighter grants
-- ============================================================================
-- The 6-digit pairing code is unauthenticated bootstrap material — anyone on
-- the internet can hit /api/devices/claim and try codes. Without a per-window
-- attempt cap, the 1M-code keyspace is brute-forceable inside a 5-minute TTL.
--
-- Key insight: per-CODE attempts can't bound blind brute force, because random
-- guesses mostly hit non-existent rows and there's nothing to increment. The
-- column only works as a defense if every claim attempt charges the active
-- code(s), regardless of which value was guessed. So this migration treats
-- attempts as "attempts during this code's active window from any source"
-- and kills any active code that crosses the cap.
--
-- Cap is 5 — single-family deployment, legitimate failure looks like 1-2
-- typos, and anything more from a kid's iPad is noise. A code that dies of
-- attempt-exhaustion is itself a signal; admin regenerates.
--
-- Direct anon RPC bypass (PostgREST + publishable key) is closed by revoking
-- EXECUTE from anon/authenticated. service_role retains its grant, which is
-- what /api/devices/claim uses via createAdminClient(). The Next handler is
-- now the only entry point.

CREATE OR REPLACE FUNCTION pradotube.consume_pairing_code(
  p_code              TEXT,
  p_device_label      TEXT,
  p_device_secret_hash BYTEA,
  p_user_agent        TEXT
)
RETURNS TABLE (
  device_id    UUID,
  kid_user_id  UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pradotube, public
AS $$
DECLARE
  v_code_id        UUID;
  v_kid_user_id    UUID;
  v_parent_user_id UUID;
  v_device_id      UUID;
  v_max_attempts   CONSTANT SMALLINT := 5;
BEGIN
  -- Charge this attempt against every currently-active code. Random guesses
  -- against non-existent code values still count — that's the whole point.
  UPDATE pairing_codes
     SET attempts = attempts + 1
   WHERE consumed_at IS NULL
     AND expires_at > now();

  -- Kill any code that just crossed the cap. Setting consumed_at removes it
  -- from the active-code partial unique index AND from the WHERE clause of
  -- the consume statement below, so an attacker's last-straw guess that
  -- happens to be the right value still fails.
  UPDATE pairing_codes
     SET consumed_at = now()
   WHERE consumed_at IS NULL
     AND expires_at > now()
     AND attempts > v_max_attempts;

  -- Try to consume the code the caller actually guessed.
  UPDATE pairing_codes
     SET consumed_at = now()
   WHERE code = p_code
     AND consumed_at IS NULL
     AND expires_at > now()
     AND id = (
       SELECT id FROM pairing_codes
        WHERE code = p_code
          AND consumed_at IS NULL
          AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
  RETURNING id, pairing_codes.kid_user_id, pairing_codes.parent_user_id
    INTO v_code_id, v_kid_user_id, v_parent_user_id;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired pairing code'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO kid_devices (
    kid_user_id, parent_user_id, device_secret_hash,
    device_label, user_agent
  )
  VALUES (
    v_kid_user_id, v_parent_user_id, p_device_secret_hash,
    NULLIF(p_device_label, ''), NULLIF(p_user_agent, '')
  )
  RETURNING id INTO v_device_id;

  device_id := v_device_id;
  kid_user_id := v_kid_user_id;
  RETURN NEXT;
END;
$$;

-- Funnel all callers through /api/devices/claim, which uses service_role.
REVOKE EXECUTE ON FUNCTION pradotube.consume_pairing_code(TEXT, TEXT, BYTEA, TEXT)
  FROM anon, authenticated, public;
-- service_role already has execute (verified pre-migration); make it explicit
-- for defense in depth against any future GRANT-default churn.
GRANT EXECUTE ON FUNCTION pradotube.consume_pairing_code(TEXT, TEXT, BYTEA, TEXT)
  TO service_role;
