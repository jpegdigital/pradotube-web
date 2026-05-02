-- Auto-populate creators.avatar_channel_id + thumbnail_url when a
-- curated_channel is first assigned to a creator. First channel wins;
-- guarded by avatar_channel_id IS NULL so manual overrides are preserved.

CREATE OR REPLACE FUNCTION set_creator_avatar_from_curated_channel()
RETURNS trigger AS $$
BEGIN
  UPDATE creators c
     SET avatar_channel_id = NEW.channel_id,
         thumbnail_url     = ch.thumbnail_url
    FROM channels ch
   WHERE c.id = NEW.creator_id
     AND c.avatar_channel_id IS NULL
     AND ch.youtube_id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_creator_avatar ON curated_channels;

CREATE TRIGGER trg_set_creator_avatar
AFTER INSERT OR UPDATE OF creator_id ON curated_channels
FOR EACH ROW
WHEN (NEW.creator_id IS NOT NULL)
EXECUTE FUNCTION set_creator_avatar_from_curated_channel();
