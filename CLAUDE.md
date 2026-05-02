<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

middleware.ts is now proxy.ts
<!-- END:nextjs-agent-rules -->

# PradoTube

Kid-friendly curated YouTube feed. Next.js 16 + Supabase. Auth is handled by an external IAM service on a sibling subdomain (`NEXT_PUBLIC_AUTH_URL`); cookies are shared across `NEXT_PUBLIC_COOKIE_DOMAIN`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (binds 0.0.0.0) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (one-shot) |
| `npm run test:watch` | Vitest in watch mode |

## Architecture

```
src/
  proxy.ts          # Next.js middleware — redirects unauthenticated requests to NEXT_PUBLIC_AUTH_URL/login
  app/              # Next.js App Router pages + API routes
    api/youtube/    # Admin-only proxy for YouTube Data API v3 (channel, search, videos)
    admin/          # Admin panel (creators/channels/subscriptions). Gated by iam.is_admin
    c/[slug]/       # Creator-filtered feed
    v/[id]/         # Video player
    feed/           # Main feed (all subscribed creators)
  components/       # React components (feed-view, video-card, creator-chips, ui/)
  hooks/            # Custom React hooks (use-feed, use-mount-effect, use-deferred-loading)
  lib/
    auth/is-admin.ts   # JWT claims → admin check (matches Postgres iam.is_admin)
    supabase/          # Browser + middleware Supabase clients (schema=pradotube)
    queries/           # Shared DB queries
    feed-scoring.ts    # Feed ranking + creator diversification
    youtube.ts         # YouTube Data API wrapper (handles HTML entity decoding)
supabase/migrations/ # Postgres schema migrations
specs/              # Feature specs and plans
```

## Data Model

`creators` → `channels` → `videos`; `user_subscriptions` joins users to creators; `watch_sessions` tracks per-user playback. Every row in `channels` is curated; `channels.creator_id` groups channels under a creator (NULL = ungrouped).

- Feed is scored (`scoreFeed` in `lib/feed-scoring.ts`) then diversified so no more than `MAX_CONSECUTIVE_SAME_CREATOR` consecutive videos share a creator.
- Videos served only when `r2_synced_at IS NOT NULL` (uploaded to Cloudflare R2).
- Media URLs: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media_path}` (direct R2 CDN).
- Sync pipeline lives in a separate repo.

## Auth & Authorization

- Login is external — the middleware at `src/proxy.ts` redirects unauthenticated requests to `${NEXT_PUBLIC_AUTH_URL}/login?next=...`.
- Session cookies (`sb-*`) are set with `domain=NEXT_PUBLIC_COOKIE_DOMAIN`, `SameSite=Lax`, `Secure` in prod — shared with sibling subdomains.
- Admin check reads `app_metadata.groups` from the JWT (`'global:admin'` or `'pradotube:admin'`). Only service-role can mutate `app_metadata`, so claims are trustworthy.
- `src/lib/auth/is-admin.ts` (client/middleware) mirrors the Postgres `iam.is_admin(app_scope)` function.

## Row-Level Security (schema `pradotube`)

RLS is enabled on every table. Policies use `iam.is_admin('pradotube')` for admin writes:

| Table | SELECT | INSERT / UPDATE / DELETE |
|-------|--------|--------------------------|
| `creators`, `channels`, `videos`, `channel_calibration`, `sync_queue` | any authenticated | admin only |
| `user_subscriptions` | own row OR admin | admin only |
| `watch_sessions` | own row | own row (no admin override) |

`pradotube.list_users()` is `SECURITY DEFINER` with a `WHERE iam.is_admin('pradotube')` guard — non-admins receive zero rows.

## Code Style

- Files: kebab-case (`feed-view.tsx`). Components: PascalCase
- Path aliases: `@/components`, `@/lib`, `@/hooks`
- shadcn/ui (base-nova style) + Tailwind CSS v4
- Client components use `"use client"` directive
- React Query for server state (5min stale time), useState for local state
- Fredoka (headings) + Nunito (body) fonts; bright Duolingo-ABC-inspired palette

## Environment

- `YOUTUBE_API_KEY` — YouTube Data API v3
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client-side key (scoped to `pradotube` schema)
- `SUPABASE_SECRET_KEY` — server-side secret
- `DATABASE_URL` — Postgres connection string
- `NEXT_PUBLIC_COOKIE_DOMAIN` — e.g. `.pof4.test` (shared auth cookie scope)
- `NEXT_PUBLIC_AUTH_URL` — e.g. `http://auth.pof4.test` (external IAM)
- `NEXT_PUBLIC_R2_PUBLIC_URL` — R2 public URL for media (frontend)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — server-side R2 creds

## Gotchas

- Supabase browser client is pinned to `db: { schema: "pradotube" }` — queries implicitly target that schema.
- Feed loads all subscribed-creator videos in one query (Supabase default row cap = 1000), then pages client-side in batches of 18 (`BATCH_SIZE` in `feed-view.tsx`).
- YouTube API responses need HTML entity decoding (handled in `lib/youtube.ts`).
- `next.config.ts` whitelists YouTube image domains + `*.r2.dev` + `grove-media.pof4.com` for next/image.
- Videos only appear in the feed when `r2_synced_at IS NOT NULL` — set by the sync consumer after R2 upload.
- HLS R2 keys follow `handle/YYYY-MM/video_id/master.m3u8` with per-tier subdirectories (480p/, 720p/).
- `src/proxy.ts` builds the post-login `next=` URL from `x-forwarded-host` / `host` headers — the auth service must allowlist `next` domains to avoid open-redirect abuse.
- Regenerate `database.types.ts` with `npx supabase gen types typescript --project-id kwtczgqcllbpaykibgzx --schema pradotube > src/lib/supabase/database.types.ts`, then `sed -i '/<claude-code-hint/d' src/lib/supabase/database.types.ts` to strip the trailing plugin hint line. Requires `SUPABASE_ACCESS_TOKEN` in env. The MCP `generate_typescript_types` tool only emits the `public` schema and is unusable here.

# Coding Principles

Use these standards, principles, and design patterns by default when architecting, designing, and writing code. Treat them as the baseline unless the user explicitly asks for a different approach.

## Core Acronyms

These are the core principles and design patterns for structured, human-readable code. Use them consistently to keep architecture and implementation explicit, readable, and easy to reason about.

| Principle | Meaning |
|-----------|---------|
| **SOLID** | Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion |
| **DI** | Dependency Injection |
| **IoC** | Inversion of Control |
| **DRY** | Don't Repeat Yourself |
| **WET** | Write Everything Twice |
| **SLAP** | Single Level of Abstraction Principle |
| **KISS** | Keep It Simple, Stupid |
| **AHA** | Avoid Hasty Abstraction |
| **YAGNI** | You Ain't Gonna Need It |

## Core Principles

### I. Progressive Complexity

Code MUST earn its abstractions through demonstrated need, following a phased approach:

1. **WET phase** — Write Everything Twice. Inline and duplicate freely until patterns emerge from real usage. Three similar blocks of code are better than a premature abstraction.
2. **SOLID phase** — When a third instance of a pattern appears, extract. Apply single-responsibility, open/closed, and dependency inversion only at this point.
3. **YAGNI phase** — Speculatively adding capability for hypothetical future requirements is forbidden. Every abstraction MUST have a concrete, current consumer.

Rules:
- Ship a thin vertical slice before broadening scope.
- If a feature can be a single-file script, it MUST remain so until complexity forces extraction.
- Delete dead code immediately; do not comment it out.
- No speculative abstractions, no premature generalization. A working script that prints output beats a polished framework that isn't wired up yet.

### II. Testing Discipline (NON-NEGOTIABLE)

TDD is mandatory for all non-trivial logic. The Red-Green-Refactor
cycle MUST be followed.

- **Write the test first.** Confirm it fails. Then implement.
- Tests MUST be runnable with the project's standard test command.
- Unit tests cover pure logic (parsing, transforming, filtering).
- Integration tests cover API interactions using recorded fixtures or
  mocks — never hit live APIs in CI.
- A feature is not done until its tests pass.

#### Parameterized Testing Convention

Use the test framework's parameterized/table-driven test facility for
any function with more than two meaningful input variations. Structure
test cases using the **give/want** convention with descriptive IDs:

```
// Pseudocode — adapt to your language's test framework
for each (give, want, id) in [
    ("input_a", "expected_a", "descriptive-case-a"),
    ("input_b", "expected_b", "descriptive-case-b"),
]:
    assert function(give) == want  // labeled with id
```

Examples by ecosystem:
- **pytest**: `@pytest.mark.parametrize("give, want", [...], ids=[...])`
- **Jest/Vitest**: `it.each([...])("case: %s", (give, want) => ...)`
- **Go**: table-driven tests with `t.Run(name, ...)`
- **JUnit**: `@ParameterizedTest` with `@MethodSource`

#### Coverage Strategy

- Happy path + at least one sad path per public function.
- Edge cases (empty input, null/nil/undefined, boundary values) MUST
  be covered for data-transforming functions.
- Mocks MUST be scoped as narrowly as possible — mock the boundary,
  not the internals.

### III. Fail Fast & Loud

Errors MUST surface immediately with actionable messages. Silent
failures are forbidden.

- Missing environment variables MUST raise on startup, not deep in a
  call stack.
- API errors MUST be caught, logged with context (URL, status code,
  response body), and re-raised or cause a non-zero exit.
- Never swallow errors with catch-all handlers (bare `catch`,
  `except Exception`, empty `rescue`, etc.).
- Use specific error/exception types. Catch only what you can
  meaningfully handle.

### IV. Configuration as Data

Runtime knobs MUST live in declarative configuration, not scattered
through code.

- Environment variables for secrets and deployment-specific values.
  Use the ecosystem's standard env-loading mechanism.
- Project manifest files for tool configuration and metadata (e.g.,
  `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`).
- No magic constants buried in logic — extract to module-level
  constants, config objects, or dedicated config files.
- Feature flags (if ever needed) MUST be data-driven, not
  `if`-branches in business logic.

### V. Code Style

Write code that is idiomatic, explicit, and composable.

- **Idiomatic** — Follow the target language's community conventions
  and standard library idioms. Use built-in facilities over
  hand-rolled equivalents.
- **Explicit over implicit** — No metaprogramming tricks, no dynamic
  property injection, no catch-all parameter forwarding unless the
  API genuinely requires it.
- **Composition over inheritance** — Prefer functions, interfaces,
  and protocols over class hierarchies. Inheritance depth MUST NOT
  exceed 2 levels.
- **Colocation & single responsibility** — Each file MUST have one
  clear job. If you cannot summarize what a file does in one
  sentence, split it. Shared utilities go in a dedicated location
  only when two or more modules genuinely need them. No god-modules,
  no catch-all utility files.
- **Type safety** — Use the strongest type system available. Prefer
  structured types (interfaces, structs, typed records) for complex
  data over untyped maps/dictionaries. Use type annotations on all
  public function signatures when the language supports them.

### VI. Anti-Patterns (Banned)

| Pattern | Why Banned | Remedy |
|---------|-----------|--------|
| Catch-all error handlers | Hides bugs, masks real errors | Catch specific types |
| `TODO` without issue link | TODOs rot; no accountability | File an issue or fix now |
| God module / catch-all utils | Violates single responsibility | Split by domain |
| Deep inheritance (>2 levels) | Cognitive overhead, fragile coupling | Composition / interfaces |
| Magic strings / numbers in logic | Ungreppable, error-prone | Named constants or config |
| Wildcard / glob imports | Pollutes namespace, breaks tooling | Explicit imports only |
| Mutable shared default state | Shared state bugs across calls | Immutable defaults or fresh init |

## Development Workflow

2. **Write test first** — even a minimal assertion that the function exists and returns the expected type.
3. **Implement until green** — smallest change to make the test pass.
4. **Refactor** — clean up only what you just touched.
5. **Commit granularly** — one logical change per commit with a clear message.
6. **Run full suite before push** — the project's test command MUST pass.
7. **Lint before push** — the project's lint and format checks MUST pass.

### Error Handling Standards

- Use specific error/exception types; define custom types when the domain requires it.
- Every error handler MUST either handle, log-and-reraise, or translate the error — never silently swallow.
- External API calls MUST have timeouts and structured error responses.

### Idempotency & Retries

- Operations that touch external services SHOULD be idempotent where feasible.
- Retries (if added) MUST use exponential backoff with jitter.
- Non-idempotent side effects MUST be clearly documented.

### Audit Trail

- All external API calls SHOULD be logged at DEBUG level with request context (URL, method, relevant params — never secrets).
- State-changing operations SHOULD produce a log entry that allows reconstruction of what happened.
