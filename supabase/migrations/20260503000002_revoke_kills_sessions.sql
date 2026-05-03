-- ============================================================================
-- Revoking a kid device must also kill the kid's Supabase sessions
-- ============================================================================
-- Problem: revoke_kid_device() previously only flipped revoked_at on the
-- kid_devices row. The browser's sb-* access token (~1h TTL) and refresh
-- token (~30d) live independently, so the iPad would keep auto-refreshing
-- through Supabase Auth itself for weeks before our /api/session/refresh
-- route ever ran the revocation check.
--
-- Per the "one iPad = one kid" model, revoking the device means revoking the
-- user's whole Supabase session — there's no other live device to spare.
-- After this, the next access-token refresh (≤1h) fails, the proxy redirects
-- to /api/session/refresh, our route sees revoked_at, clears pt_device, and
-- lands on /setup.

CREATE OR REPLACE FUNCTION pradotube.revoke_kid_device(p_device_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pradotube, public
AS $$
DECLARE
  v_kid_user_id UUID;
BEGIN
  IF NOT iam.is_admin('pradotube') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  UPDATE pradotube.kid_devices
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = (select auth.uid())
   WHERE id = p_device_id
  RETURNING kid_user_id INTO v_kid_user_id;

  IF v_kid_user_id IS NULL THEN
    RETURN;  -- unknown device id; nothing to do
  END IF;

  -- Kill all live sessions for the kid. Sessions cascade-delete refresh
  -- tokens by FK, but we DELETE both explicitly so behavior is independent
  -- of the auth schema's FK definitions (which Supabase can change).
  DELETE FROM auth.refresh_tokens WHERE user_id = v_kid_user_id::text;
  DELETE FROM auth.sessions       WHERE user_id = v_kid_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION pradotube.revoke_kid_device(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION pradotube.revoke_kid_device(UUID) FROM anon, public;
