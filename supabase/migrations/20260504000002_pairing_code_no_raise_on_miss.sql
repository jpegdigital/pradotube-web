-- ============================================================================
-- consume_pairing_code: don't RAISE on miss — it rolls back the attempt counter
-- ============================================================================
-- Bug in the previous migration: RAISE EXCEPTION on a wrong-code miss aborts
-- the transaction, which undoes the `UPDATE pairing_codes SET attempts =
-- attempts + 1` we just performed. The attempts cap therefore never engaged
-- because every miss reset itself.
--
-- Fix: return empty (no row) on miss instead of raising. The /api/devices/claim
-- handler already treats `rpcData.length === 0` as a 400, so the API contract
-- is unchanged — only the side-effect on `attempts` is preserved.

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
  UPDATE pairing_codes
     SET attempts = attempts + 1
   WHERE consumed_at IS NULL
     AND expires_at > now();

  UPDATE pairing_codes
     SET consumed_at = now()
   WHERE consumed_at IS NULL
     AND expires_at > now()
     AND attempts > v_max_attempts;

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
    -- Empty result; the caller turns this into a 400. Critically, we do NOT
    -- RAISE — that would roll back the attempts increment above and the
    -- per-window cap would never engage.
    RETURN;
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
