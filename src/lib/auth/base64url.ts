// base64url codec — RFC 4648 §5. No padding, "+" → "-", "/" → "_".
//
// Used by every piece of the device-pairing flow: JWT signing
// (`device-jwt.ts`), the `pt_device` cookie codec (`device-cookie.ts`), and
// the Supabase session cookie format (`supabase-cookie.ts`). Web-Crypto +
// btoa/atob keep this runnable on both Node 18+ and the Edge runtime.

export function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function base64urlEncodeString(input: string): string {
  return base64urlEncode(new TextEncoder().encode(input));
}

export function base64urlDecode(input: string): Uint8Array {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4 || 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
