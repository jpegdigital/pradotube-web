import { describe, expect, it } from "vitest";
import {
  base64urlDecode,
  base64urlEncode,
  base64urlEncodeString,
} from "@/lib/auth/base64url";

describe("base64url", () => {
  it("encodes and decodes round-trip for arbitrary bytes", () => {
    const cases: Uint8Array[] = [
      new Uint8Array([]),
      new Uint8Array([0]),
      new Uint8Array([255, 0, 128]),
      new Uint8Array(Array.from({ length: 64 }, (_, i) => i)),
    ];
    for (const original of cases) {
      const encoded = base64urlEncode(original);
      expect(encoded).not.toMatch(/[+/=]/);
      const decoded = base64urlDecode(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    }
  });

  it("encodes strings via UTF-8", () => {
    const encoded = base64urlEncodeString("hello world");
    expect(encoded).toBe("aGVsbG8gd29ybGQ");
  });

  it("decodes a known JWT-style header", () => {
    const decoded = base64urlDecode("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(new TextDecoder().decode(decoded)).toBe(
      '{"alg":"HS256","typ":"JWT"}'
    );
  });
});
