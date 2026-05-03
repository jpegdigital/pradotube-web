-- ============================================================================
-- Bind kid_devices to the Supabase session it minted, and revoke surgically
-- ============================================================================
-- The previous revoke implementation nuked every session for the kid user,
-- which is overkill: it would log a kid out of any other context (e.g. an
-- admin impersonating that user, future multi-device support). Now each
-- kid_devices row carries the session_id of the one Supabase session it
-- created via /api/devices/claim or /api/session/refresh; revoke drops only
-- that session.
--
-- Migration is idempotent w.r.t. existing rows: any device created before
-- this migration will have session_id NULL and revoke will simply flip the
-- revoked_at flag. The next time that device hits /api/session/refresh, the
-- route will write its newly-minted session_id and revocation becomes
-- precise from then on.

ALTER TABLE pradotube.kid_devices
  ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_kid_devices_session
  ON pradotube.kid_devices(session_id)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION pradotube.revoke_kid_device(p_device_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pradotube, public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF NOT iam.is_admin('pradotube') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  -- Read the bound session id BEFORE the update so we can delete it after.
  SELECT session_id INTO v_session_id
    FROM pradotube.kid_devices
   WHERE id = p_device_id;

  UPDATE pradotube.kid_devices
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = (select auth.uid()),
         session_id = NULL
   WHERE id = p_device_id;

  IF v_session_id IS NOT NULL THEN
    -- refresh_tokens.session_id has FK ON DELETE CASCADE on auth.sessions.id
    -- in current Supabase, but we delete both explicitly so behavior is
    -- independent of any future schema change.
    DELETE FROM auth.refresh_tokens WHERE session_id = v_session_id;
    DELETE FROM auth.sessions       WHERE id         = v_session_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION pradotube.revoke_kid_device(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION pradotube.revoke_kid_device(UUID) FROM anon, public;
