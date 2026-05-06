#!/usr/bin/env node
// One-time backfill: download existing creator/channel thumbnails (mostly from
// yt3.googleusercontent.com) and re-host them in R2 under stable paths, then
// write the R2 key into the new avatar_path column.
//
// Usage (Node 20+):
//   node --env-file=.env.local scripts/import-avatars-to-r2.mjs
//   node --env-file=.env.local scripts/import-avatars-to-r2.mjs --dry-run
//   node --env-file=.env.local scripts/import-avatars-to-r2.mjs --only=creators
//   node --env-file=.env.local scripts/import-avatars-to-r2.mjs --only=channels
//   node --env-file=.env.local scripts/import-avatars-to-r2.mjs --force
//
// --dry-run  : list rows that would be processed; do not fetch/upload/update.
// --only=    : restrict to one of "creators" or "channels".
// --force    : re-process rows that already have avatar_path set.
//
// Required env (loaded via --env-file=.env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const TARGET_SIZE = 512;
const WEBP_QUALITY = 85;
const FETCH_TIMEOUT_MS = 15_000;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const onlyArg = [...args].find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1] : null;
if (only && only !== "creators" && only !== "channels") {
  console.error(`Invalid --only=${only}; expected "creators" or "channels"`);
  process.exit(2);
}

const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
};
for (const [k, v] of Object.entries(env)) {
  if (!v) {
    console.error(`Missing env var: ${k}. Did you pass --env-file=.env.local?`);
    process.exit(2);
  }
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  db: { schema: "pradotube" },
  auth: { persistSession: false },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// YouTube CDN URLs typically end in `=s240-c-k-c0x00ffffff-no-rj`. Bumping to
// =s512 returns a higher-resolution source; we re-encode anyway via sharp.
function upgradeYoutubeSize(url) {
  return url.replace(/=s\d+(-[^?]*)?/, "=s512-c-k-c0x00ffffff-no-rj");
}

async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function processOne({ label, key, sourceUrl, table, idColumn, idValue }) {
  const sourceForFetch = sourceUrl.includes("googleusercontent.com")
    ? upgradeYoutubeSize(sourceUrl)
    : sourceUrl;

  console.log(`[${label}] ${idValue}`);
  console.log(`         src: ${sourceForFetch}`);
  console.log(`         dst: ${key}`);

  if (dryRun) return { ok: true, skipped: true };

  const raw = await fetchWithTimeout(sourceForFetch, FETCH_TIMEOUT_MS);

  const webp = await sharp(raw)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "center" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: webp,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000",
    })
  );

  const { error } = await supabase
    .from(table)
    .update({ avatar_path: key })
    .eq(idColumn, idValue);
  if (error) throw new Error(`DB update failed: ${error.message}`);

  console.log(`         uploaded ${webp.byteLength} bytes`);
  return { ok: true, bytes: webp.byteLength };
}

async function loadCreators() {
  let q = supabase
    .from("creators")
    .select("id, slug, thumbnail_url, avatar_path")
    .not("thumbnail_url", "is", null)
    .order("slug", { ascending: true });
  if (!force) q = q.is("avatar_path", null);
  const { data, error } = await q;
  if (error) throw new Error(`Load creators: ${error.message}`);
  return data ?? [];
}

async function loadChannels() {
  let q = supabase
    .from("channels")
    .select("youtube_id, title, thumbnail_url, avatar_path")
    .not("thumbnail_url", "is", null)
    .order("youtube_id", { ascending: true });
  if (!force) q = q.is("avatar_path", null);
  const { data, error } = await q;
  if (error) throw new Error(`Load channels: ${error.message}`);
  return data ?? [];
}

async function main() {
  console.log(
    `Avatar import — dryRun=${dryRun} force=${force} only=${only ?? "both"}`
  );

  const stats = { creators: { ok: 0, fail: 0 }, channels: { ok: 0, fail: 0 } };

  if (!only || only === "creators") {
    const creators = await loadCreators();
    console.log(`\nCreators to import: ${creators.length}`);
    for (const c of creators) {
      try {
        await processOne({
          label: "creator",
          key: `creators/${c.id}/avatar.webp`,
          sourceUrl: c.thumbnail_url,
          table: "creators",
          idColumn: "id",
          idValue: c.id,
        });
        stats.creators.ok++;
      } catch (e) {
        console.error(`  ERROR creator ${c.slug ?? c.id}: ${e.message}`);
        stats.creators.fail++;
      }
    }
  }

  if (!only || only === "channels") {
    const channels = await loadChannels();
    console.log(`\nChannels to import: ${channels.length}`);
    for (const ch of channels) {
      try {
        await processOne({
          label: "channel",
          key: `channels/${ch.youtube_id}/avatar.webp`,
          sourceUrl: ch.thumbnail_url,
          table: "channels",
          idColumn: "youtube_id",
          idValue: ch.youtube_id,
        });
        stats.channels.ok++;
      } catch (e) {
        console.error(
          `  ERROR channel ${ch.youtube_id} (${ch.title}): ${e.message}`
        );
        stats.channels.fail++;
      }
    }
  }

  console.log("\nDone.");
  console.log(
    `  creators: ${stats.creators.ok} ok, ${stats.creators.fail} failed`
  );
  console.log(
    `  channels: ${stats.channels.ok} ok, ${stats.channels.fail} failed`
  );
  if (stats.creators.fail || stats.channels.fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
