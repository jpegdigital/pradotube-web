import "server-only";

import { base64urlDecode, base64urlEncode } from "./base64url";

// pt_device cookie format: `<base64url(uuid bytes)>.<base64url(secret bytes)>`.
// The raw 32-byte secret stays only in the cookie; the database stores
// SHA-256(secret). On refresh we look up the row by device_id, hash the
// cookie's secret, and constant-time compare. A DB leak alone can't be used
// to forge a session because the hash is one-way.

const SECRET_BYTES = 32;
const UUID_BYTES = 16;

export interface DeviceCookiePayload {
  deviceId: string;
  rawSecret: Uint8Array;
}

export function generateDeviceSecret(): {
  rawSecret: Uint8Array;
  rawSecretBase64Url: string;
} {
  const rawSecret = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(rawSecret);
  return { rawSecret, rawSecretBase64Url: base64urlEncode(rawSecret) };
}

export async function hashDeviceSecret(
  rawSecret: Uint8Array
): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    rawSecret as BufferSource
  );
  return new Uint8Array(digest);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function encodeDeviceCookie(
  deviceId: string,
  rawSecretBase64Url: string
): string {
  return `${base64urlEncode(uuidToBytes(deviceId))}.${rawSecretBase64Url}`;
}

export function decodeDeviceCookie(
  cookieValue: string
): DeviceCookiePayload | null {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  try {
    const idBytes = base64urlDecode(parts[0]);
    if (idBytes.length !== UUID_BYTES) return null;
    const rawSecret = base64urlDecode(parts[1]);
    if (rawSecret.length !== SECRET_BYTES) return null;
    return { deviceId: bytesToUuid(idBytes), rawSecret };
  } catch {
    return null;
  }
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`invalid uuid: ${uuid}`);
  const bytes = new Uint8Array(UUID_BYTES);
  for (let i = 0; i < UUID_BYTES; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
