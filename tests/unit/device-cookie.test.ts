import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  decodeDeviceCookie,
  encodeDeviceCookie,
  generateDeviceSecret,
  hashDeviceSecret,
} from "@/lib/auth/device-cookie";

const SAMPLE_UUID = "12345678-1234-4234-8234-1234567890ab";

describe("device-cookie", () => {
  it("generates 32-byte secrets", () => {
    const { rawSecret } = generateDeviceSecret();
    expect(rawSecret.length).toBe(32);
  });

  it("encode/decode round-trips", () => {
    const { rawSecret, rawSecretBase64Url } = generateDeviceSecret();
    const cookie = encodeDeviceCookie(SAMPLE_UUID, rawSecretBase64Url);
    const decoded = decodeDeviceCookie(cookie);
    expect(decoded).not.toBeNull();
    expect(decoded!.deviceId).toBe(SAMPLE_UUID);
    expect(Array.from(decoded!.rawSecret)).toEqual(Array.from(rawSecret));
  });

  it("rejects malformed cookies", () => {
    expect(decodeDeviceCookie("")).toBeNull();
    expect(decodeDeviceCookie("not-a-cookie")).toBeNull();
    expect(decodeDeviceCookie("AAAA.BBBB")).toBeNull(); // wrong byte counts
    expect(decodeDeviceCookie("a.b.c")).toBeNull(); // wrong segment count
  });

  it("hashes deterministically", async () => {
    const secret = new Uint8Array(32);
    secret[0] = 1;
    const a = await hashDeviceSecret(secret);
    const b = await hashDeviceSecret(secret);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.length).toBe(32);
  });

  it("hash differs for different secrets", async () => {
    const a = new Uint8Array(32);
    const b = new Uint8Array(32);
    b[0] = 1;
    const ha = await hashDeviceSecret(a);
    const hb = await hashDeviceSecret(b);
    expect(Array.from(ha)).not.toEqual(Array.from(hb));
  });

  it("constant-time compare matches identical buffers", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("constant-time compare rejects single-byte differences", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("constant-time compare rejects different lengths", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 0]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});
