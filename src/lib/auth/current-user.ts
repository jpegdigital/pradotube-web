import type { Session } from "@supabase/supabase-js";
import {
  decodeJwtClaims,
  getJwtGroups,
  hasAdminGroup,
  type JwtClaims,
} from "@/lib/auth/jwt";

export interface CurrentUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  groups: readonly string[];
  isAdmin: boolean;
}

export function buildCurrentUser(
  claims: JwtClaims | null | undefined
): CurrentUser | null {
  const id = claims?.sub;
  if (!id) return null;

  const email = claims.email ?? null;
  const firstName = claims.user_metadata?.first_name ?? null;
  const lastName = claims.user_metadata?.last_name ?? null;
  const groups = [...getJwtGroups(claims)];

  return {
    id,
    email,
    firstName,
    lastName,
    displayName: firstName ?? email?.split("@")[0] ?? "User",
    groups,
    isAdmin: hasAdminGroup(claims),
  };
}

export function buildCurrentUserFromSession(
  session: Session | null
): CurrentUser | null {
  if (!session?.user) return null;

  const tokenClaims = decodeJwtClaims(session.access_token);

  return buildCurrentUser({
    sub: tokenClaims?.sub ?? session.user.id,
    email: tokenClaims?.email ?? session.user.email,
    app_metadata: tokenClaims?.app_metadata ?? session.user.app_metadata,
    user_metadata: tokenClaims?.user_metadata ?? session.user.user_metadata,
  });
}
