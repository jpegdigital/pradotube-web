import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const AVATAR_TARGET_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 85;

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export async function normalizeToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(AVATAR_TARGET_SIZE, AVATAR_TARGET_SIZE, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: AVATAR_WEBP_QUALITY })
    .toBuffer();
}

export async function putAvatarToR2(
  key: string,
  body: Buffer
): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000",
    })
  );
}

export const CREATOR_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Channel IDs are usually `UC...` (24 chars) but we also store manual entries
// like `tv-tmdb-45666` for non-YouTube content. Restrict to safe URL/path
// characters and a sane length so the value is always safe to use as part of
// an R2 key prefix. The route still scopes the key prefix; bogus IDs only
// risk orphaned objects, not path traversal.
export const CHANNEL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{4,63}$/;

export function avatarKeyFor(
  kind: "creator" | "channel",
  id: string
): string {
  return kind === "creator"
    ? `creators/${id}/avatar.webp`
    : `channels/${id}/avatar.webp`;
}
