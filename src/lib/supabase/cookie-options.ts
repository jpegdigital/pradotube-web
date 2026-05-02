// Shared cookie options for every Supabase client in the project.
//
// The browser, server, and proxy clients all read and write the same session
// cookie. If their options diverge (domain in particular) the browser can
// write a cookie scoped to `.pof4.test` while the proxy refreshes a cookie
// scoped to a host like `tube.pof4.test`, leaving two cookies with the same
// name and breaking session continuity across subdomains. Keep this the
// single source of truth.
export const cookieOptions = {
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
