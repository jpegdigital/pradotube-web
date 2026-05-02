-- Drop creators.avatar_channel_id and creators.cover_channel_id.
--
-- creators.thumbnail_url is now the single source of truth for the creator
-- avatar. The cover FK was never read by anything; the avatar FK was only
-- used by the admin avatar picker for an "active option" highlight, which
-- the displayed avatar already conveys visually.
--
-- Removing both FKs also collapses the creators<->channels relationship
-- back to one (channels.creator_id), so PostgREST embeds no longer need
-- the channels!channels_creator_id_fkey hint.

SET search_path TO pradotube, public;

-- 1. Trigger now only writes thumbnail_url. Keep the IS NULL guard so
--    manual overrides aren't clobbered when channels are reshuffled.

CREATE OR REPLACE FUNCTION pradotube.set_creator_avatar_from_channel()
RETURNS trigger AS $$
BEGIN
  UPDATE pradotube.creators c
     SET thumbnail_url = NEW.thumbnail_url
   WHERE c.id = NEW.creator_id
     AND c.thumbnail_url IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the columns. CASCADE the FK constraints implicitly via DROP COLUMN.

ALTER TABLE creators
  DROP COLUMN avatar_channel_id,
  DROP COLUMN cover_channel_id;
