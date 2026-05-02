export const APP_SCOPE = "pradotube";

export interface JwtClaims {
  sub?: string;
  email?: string;
  app_metadata?: { groups?: string[] } & Record<string, unknown>;
  user_metadata?: { first_name?: string; last_name?: string } & Record<
    string,
    unknown
  >;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);

  if (typeof atob === "function") {
    const decoded = atob(padded);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(padded, "base64").toString("utf-8");
}

export function decodeJwtClaims(
  accessToken: string | null | undefined
): JwtClaims | null {
  if (!accessToken) return null;

  const [, payload] = accessToken.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtClaims;
  } catch {
    return null;
  }
}

export function getJwtGroups(
  claims: JwtClaims | null | undefined
): readonly string[] {
  const groups = claims?.app_metadata?.groups;
  return Array.isArray(groups) ? groups : [];
}

export function hasAdminGroup(
  claims: JwtClaims | null | undefined
): boolean {
  const groups = getJwtGroups(claims);

  return (
    groups.includes("global:admin") || groups.includes(`${APP_SCOPE}:admin`)
  );
}
