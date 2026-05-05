# PradoTube — Device Pairing Penetration Test

**Scope:** Device-pairing PIN flow only (`/api/devices/pair`, `/api/devices/claim`, `/api/devices/revoke`, `/api/session/refresh`, the SECURITY DEFINER RPCs `consume_pairing_code` and `revoke_kid_device`, the `/pair` and `/setup` pages, and the `proxy.ts` gate that exempts both pages).
**Targets:** `http://pradotube.pof4.test:3000`, `http://auth.pof4.test:3015`, `https://kwtczgqcllbpaykibgzx.supabase.co`.
**Date:** 2026-05-04.
**Out of scope:** All non-pairing routes (admin panel, feed, video player, YouTube proxy, watch sessions). The IAM service was probed only for reachability.

---

## Executive summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High     | 1 |
| Medium   | 1 |
| Low      | 2 |

The pairing flow is fundamentally **brute-forceable**. A 6-digit code (1,000,000 possibilities) can be guessed without authentication, without rate limiting, and from two independent network paths. Within a single 5-minute active-code window an attacker measurably reaches ~12,000 attempts (1.2% chance of hijack per active window) from one residential connection; production-scale infrastructure pushes this well above 50% per window. The `attempts` column added to `pairing_codes` is never read or written anywhere in the codebase, so the schema looks defended but isn't.

A successful guess yields:
1. A valid `pt_device` cookie bound to the kid's account (400-day TTL).
2. A real Supabase session for the kid via `admin.auth.admin.generateLink` + `verifyOtp`.

There is also a privilege-boundary issue in `/api/devices/pair`: an admin can mint a pairing code for **any** `auth.users.id`, including other admins. The pairing flow assumes "kid_user_id" semantically refers to a kid, but nothing in the route or RPC enforces that.

Auth gates on the privileged endpoints (`pair`, `revoke`) are correctly enforced, the open-redirect surface in `/api/session/refresh?next=` is correctly sanitized, and SameSite=Lax + the JSON content-type expectation neutralizes practical CSRF against admin endpoints. Those are not findings.

---

## F-01 (Critical) — Unauthenticated brute force on the 6-digit pairing code

**Files:** `src/app/api/devices/claim/route.ts:17-51`, `supabase/migrations/20260503000001_kid_device_pairing.sql:83-147`.

### What

`POST /api/devices/claim` accepts an arbitrary `code` from any unauthenticated caller and forwards it into the `consume_pairing_code` RPC. The RPC's only guards are: code matches, `consumed_at IS NULL`, and `expires_at > now()`. There is no per-IP throttle, no per-code attempt counter, no global cap, no CAPTCHA, no progressive delay. The `pairing_codes.attempts SMALLINT NOT NULL DEFAULT 0` column is created in migration `20260503000001` but **never incremented or read anywhere** (verified by grepping the entire `src/` tree — only references are in the generated `database.types.ts`).

The TTL is 5 minutes. The single-active-row unique index (`uniq_pairing_codes_active`) means at most one code per code-value, but multiple parents pairing concurrently each contribute their own active code, so the effective attack space is the union of all active codes at any moment.

### Live evidence

200 parallel attempts via the Next handler:

```
$ seq 1 200 | xargs -I {} -P 20 -n 1 sh -c '
    CODE=$(printf "%06d" $(( (RANDOM * 32) % 1000000 )))
    curl -sS -X POST "http://pradotube.pof4.test:3000/api/devices/claim" \
      -H "Content-Type: application/json" \
      -d "{\"code\":\"$CODE\"}" -o /dev/null -w "%{http_code}\n"
' | sort | uniq -c
    200 400
elapsed_seconds=5
```

40 req/s sustained, all 400 with no degradation, no IP blocking, no progressive delay.

Per-request timing stayed flat throughout (`time_total ≈ 75–90 ms`):

```
claim_invalid time=0.286488   # cold start
claim_invalid time=0.086043
claim_invalid time=0.092071
claim_invalid time=0.075423
claim_invalid time=0.072160
```

### Math

* 1,000,000 codes × 5-minute window × 1 attacker @ 40 req/s ≈ 12,000 attempts → **~1.2% per window** with one active code.
* A residential botnet at 200 req/s and any window with 3 simultaneously active codes gives **~18% per window**.
* A parent who pairs once a day → expected hijack inside ~80 days at the conservative single-source rate; inside **a single afternoon** with botnet + multiple parents.

### Impact

A successful guess returns the kid's Supabase session and a 400-day `pt_device` cookie. The attacker becomes that kid for all practical purposes — they can navigate the feed, watch sessions get logged against the kid's account, and, because the cookie binds the device long after a `revoke_kid_device` (see F-06), an admin clicking "Revoke" doesn't immediately push the attacker out for up to one access-token lifetime.

### Remediation

* **Per-code attempt cap.** Move `consume_pairing_code` to incrementing `pairing_codes.attempts` on every miss (not just hits) and rejecting when `attempts >= 10`. This is the primary defense — the column already exists.
* **Increase entropy or use a secondary channel.** A 6-digit code is too short for an unauthenticated brute-force surface. Either lengthen to 8 digits / mix alphanumeric (with care for kid-readability), or pair the code with a short-lived device pre-token issued at `/setup` (e.g., a server-set first-party cookie generated when `/setup` loads, required as a header on `/claim`).
* **Per-IP throttle.** Add a network-layer rate limit at the proxy/CDN — e.g., 30 req/min/IP on `/api/devices/claim`. Necessary but not sufficient; mobile-NAT'd attackers and botnets bypass IP throttles.
* **Progressive delay.** Each consecutive miss against an active code from the same IP should add 250 ms × N latency. Cheap, makes high-throughput grind impossible.
* **Alert on miss-rate.** Any single code seeing >5 failed attempts in 60 s should trip an alert and force regeneration.

---

## F-02 (Critical) — Direct PostgREST RPC bypass of the Next.js handler

**Files:** `supabase/migrations/20260503000001_kid_device_pairing.sql:144-147`, `.env`.

### What

The pairing RPC is granted to the `anon` role:

```sql
GRANT EXECUTE ON FUNCTION pradotube.consume_pairing_code(TEXT, TEXT, BYTEA, TEXT)
  TO authenticated, anon;
```

The publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) is, by Next.js convention, inlined into client bundles for any page that uses the browser Supabase client. Even on this scope it's recoverable from the `.env` file's name — `NEXT_PUBLIC_*` is documented public. With the project URL and the publishable key, any external caller can hit the RPC directly via PostgREST without going through `/api/devices/claim`. Whatever Next-layer rate limit a defender adds at `/api/devices/claim` is bypassed.

### Live evidence

Direct call against the Supabase backend, no app cookie, no Next handler in the path:

```
$ curl -sS -X POST "https://kwtczgqcllbpaykibgzx.supabase.co/rest/v1/rpc/consume_pairing_code" \
    -H "apikey: sb_publishable_iB2VAtBClXUjY_P7c7StjQ_HEOjOcza" \
    -H "Authorization: Bearer sb_publishable_iB2VAtBClXUjY_P7c7StjQ_HEOjOcza" \
    -H "Content-Profile: pradotube" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/rpc-payload.json
{"code":"P0002","details":null,"hint":null,"message":"invalid or expired pairing code"}
STATUS=500
```

`P0002` is the `RAISE EXCEPTION` from inside `consume_pairing_code` — confirming the RPC executed against the active code-validation logic. A valid code would have returned `(device_id, kid_user_id)` and inserted a `kid_devices` row owned by an attacker-controlled secret hash.

200 parallel direct-RPC attempts:

```
    200 500
elapsed_seconds=7
```

~28 req/s from a single home connection against the Supabase production backend. No 429s, no ratelimit headers in the response, no anomaly behavior.

### Impact

Worse than F-01: this attack works even if Next gets a per-IP throttle, a CAPTCHA, or any defense in front of `/api/devices/claim`. The attacker who guesses a code via direct RPC inserts their own `kid_devices` row with their own secret hash. They then need a Supabase session — which is also reachable directly. Either:

* Hit `/api/session/refresh?next=/` with a fabricated `pt_device` cookie pointing at the row they just inserted; the route looks up the device, hashes the cookie's secret, constant-time-compares to the stored hash they set themselves, and mints a session via `generateLink` + `verifyOtp`. **End-to-end account takeover with zero further interaction.**

This means the Next layer cannot be the security boundary. The boundary is the RPC.

### Remediation

* **Move attempt tracking and rate limiting into the RPC itself.** Increment `pairing_codes.attempts` on every miss in `consume_pairing_code` and reject when `attempts >= 10`. Same defense as F-01 but enforced where it matters.
* **Require a server-minted nonce.** Make the RPC require a fourth argument that's a short-lived, server-signed token only `/api/devices/claim` knows how to mint. The Next handler becomes the only viable entry point. Don't grant `anon` direct execute.
* **Tighten the GRANT.** Removing `anon` from the grant list breaks the unauthenticated claim flow — the route would have to call the RPC with the service-role client (`createAdminClient()`). It already imports `createAdminClient`; switch the call from the SSR client to admin and revoke `anon` execute.

---

## F-03 (High) — `/api/devices/pair` allows an admin to pair an iPad to any user

**File:** `src/app/api/devices/pair/route.ts:9-52`.

### What

The route accepts an arbitrary `kidUserId` from the request body and writes:

```ts
await admin.from("pairing_codes").insert({
  code,
  kid_user_id: body.kidUserId,
  parent_user_id: parentUserId,
  expires_at: expiresAt.toISOString(),
});
```

There is no check that `kidUserId`:
* is a member of a "kids" set (no such concept exists in schema)
* is **not** also an admin
* is "owned" or "managed" by the requesting admin

The `parent_user_id` is recorded but never read by any downstream auth check — `/api/devices/claim` and the consume RPC don't compare it to the requester. Once the code is consumed, the device gets a Supabase session for whoever's `kid_user_id` is on the code.

### Impact

A malicious or compromised admin can:

1. Mint a pair code targeting another admin's `auth.users.id`.
2. Walk the code through `/pair` on any iPad they control.
3. End up with a long-lived `pt_device` cookie + Supabase session as the **other admin** — full lateral takeover within the admin tier.

This is a stronger attack than "admin already has admin powers" because:
* The IAM may be the system of record for who's an admin, with audit trails. A pairing code creates a session that bypasses any IAM-level approval (MFA prompts, approval workflows, login alerting).
* `pt_device` is a 400-day persistent cookie. Even if the IAM later locks the admin's account, the paired iPad keeps refreshing.
* `kid_devices.parent_user_id` records the *attacker* as the parent. There's no "this device was paired by admin A as admin B" audit; the natural reading of the row is "admin A is admin B's parent," which is wrong.

### Remediation

* In `/api/devices/pair`, look up the target user via the admin client and reject if `iam.is_admin('pradotube')` returns true for that user (or, equivalently, if their `app_metadata.groups` contains the admin entry).
* Add a "kid users" concept — a Postgres view or boolean column `auth.users.metadata.is_kid` set explicitly by IAM workflow, and verify the target row is in the kid set before inserting.
* Reject if `kidUserId === parentUserId` to block self-pairing as a separate code path.
* Optionally constrain pairing codes by parent: only the `parent_user_id` who minted the code can have their device claim it. This requires a parent-to-kid binding outside this scope to be useful.

---

## F-04 (Medium) — `user_agent` is stored uncapped

**File:** `src/app/api/devices/claim/route.ts:28`.

### What

```ts
const userAgent = request.headers.get("user-agent") ?? "";
```

`deviceLabel` is explicitly capped at 80 characters (`(body.deviceLabel ?? "").trim().slice(0, 80)`), but `userAgent` is forwarded to the RPC verbatim. The `kid_devices.user_agent` column is `TEXT` (no length cap). An attacker controlling a User-Agent header can store megabytes per row. Combined with F-01/F-02, every successful brute-force attempt also writes a row, so an attacker can cheaply inflate table size and admin-page payload size.

### Impact

* Storage bloat in `kid_devices`.
* Admin device list (`src/app/admin/devices/page.tsx:97-104`) selects `user_agent` and ships it to the browser; very large UAs degrade the admin page.
* No memory-safety or query-execution issue per se; this is a quality-of-service finding.

### Remediation

```ts
const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 256);
```

Mirror the cap that already exists for `deviceLabel`.

---

## F-05 (Low) — DB error detail returned to client on `/api/devices/pair` 500

**File:** `src/app/api/devices/pair/route.ts:62-76`.

```ts
const detail =
  lastError && typeof lastError === "object"
    ? {
        message: (lastError as { message?: string }).message,
        code: (lastError as { code?: string }).code,
        details: (lastError as { details?: string }).details,
        hint: (lastError as { hint?: string }).hint,
      }
    : { raw: String(lastError) };
return NextResponse.json(
  { error: "could not create code", detail },
  { status: 500 }
);
```

Postgres error `message`/`details`/`hint` are returned verbatim. They can leak schema details (column names, FK constraint names, index names) to the client. The route is admin-only, so the surface is small, but combined with F-03 a low-trust admin gets schema reconnaissance for free.

### Remediation

Log the full detail; return `{ error: "could not create code" }` to the client with an opaque correlation id.

---

## F-06 (Low) — `session_id` bind is best-effort; revoke can silently degrade to flag-only

**Files:** `src/app/api/devices/claim/route.ts:102-115`, `src/app/api/session/refresh/route.ts:82-95`, `supabase/migrations/20260503000003_kid_devices_session_id.sql:24-56`.

### What

After `verifyOtp`, both the claim and the refresh routes update `kid_devices.session_id` with the JWT's `session_id` claim. If that update fails, the code logs and proceeds — the session is live but unbound. `revoke_kid_device` then can't find a `session_id` to delete and only flips `revoked_at`. The kid's access token (~1 h TTL) keeps validating until the next refresh, at which point the proxy redirects to `/api/session/refresh`, the refresh route sees `revoked_at`, and clears the cookie. So an admin clicking "Revoke" doesn't immediately log the device out.

The window is bounded by the access-token TTL (≤1 h), but for a parent revoking because the device was lost or compromised, "up to one hour" is meaningful.

### Remediation

* If the `session_id` bind UPDATE fails, fail the whole claim/refresh and roll back. The session was just minted; deleting it via `auth.admin.signOut` is a clean compensating action.
* Or, accept the soft path but make it explicit: when `revoke_kid_device` finds `session_id` is NULL, fall back to deleting **all** active sessions for that `kid_user_id`. Migration `20260503000002` did exactly this; migration `20260503000003` traded that for surgical revocation but lost the failure-mode safety net.

---

## What was tested and not found vulnerable

* **Auth gates on `/api/devices/pair` and `/api/devices/revoke`** — Both correctly reject unauthenticated callers with 401 and non-admin callers with 403. RPC `revoke_kid_device` re-checks `iam.is_admin('pradotube')` server-side.
* **CSRF on admin endpoints** — `sb-*` cookies are SameSite=Lax, and both routes parse `request.json()`, which won't accept top-level form-encoded POST bodies. Cross-origin `fetch` with credentials would need `application/json`, which forces a CORS preflight that the routes don't allow. Defense is fragile (it's the content-type expectation, not an explicit CSRF token), but the chain holds today.
* **Open redirect in `/api/session/refresh?next=`** — `sanitizeNext` rejects `//host` and reduces absolute URLs to `pathname + search + hash`, which is then resolved against the trusted `baseUrl`. Backslash variants normalize to escaped paths and don't escape origin.
* **Code generation entropy** — `generateSixDigitCode` uses `crypto.getRandomValues` with reject-sampling against modulo bias. The entropy is tight to its 6-decimal-digit ceiling; the brute-force surface (F-01) is independent of generation quality.
* **Constant-time comparison of device-cookie secret** — `constantTimeEqual` in `device-cookie.ts` is correct (length check first, XOR-OR loop, no early return).
* **SECURITY DEFINER RPC search_path** — Both `consume_pairing_code` and `revoke_kid_device` set `search_path = pradotube, public`, so the schema-hijack class of attack is blocked.

---

## Recommended remediation order

1. **F-01 + F-02 together** — Both are "the 6-digit code is brute-forceable." Fix at the RPC: increment `pairing_codes.attempts` on every miss, reject at `>= 10`, and enforce in `consume_pairing_code` itself. Either restrict the GRANT to `authenticated` (and use the service-role client from `/api/devices/claim`) or require a server-minted nonce. This single change closes both criticals.
2. **F-03** — Validate `kidUserId` is non-admin in `/api/devices/pair` before insert.
3. **F-04** — Cap `userAgent` to 256 chars in `/api/devices/claim`.
4. **F-05** — Strip DB error detail from the pair-route 500 response.
5. **F-06** — Either fail-closed on `session_id` bind failure or add a NULL-session fallback in `revoke_kid_device`.

A defense-in-depth bonus: add a per-IP rate limit at whatever sits in front of the app (Cloudflare, Vercel edge config) on both `/api/devices/claim` and the `/rest/v1/rpc/consume_pairing_code` path. Won't stop a determined attacker (mobile NAT, botnet) but raises the floor for opportunistic abuse.
