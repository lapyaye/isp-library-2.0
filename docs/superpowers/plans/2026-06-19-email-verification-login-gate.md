# Email Verification Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block unverified users from logging in, and give them a way to resend the confirmation email.

**Architecture:** Add a single authoritative gate in `login()` (DB `is_verified` is the source of truth, so it cannot be spoofed by a forged token and is re-checked on every fresh login). The login route surfaces a distinct `403 + needsVerification` response so the client can show a resend button wired to a new public `/api/auth/resend-confirmation` endpoint that reuses the existing account-confirm token + Mailchimp email helpers.

**Tech Stack:** Next.js 16 App Router route handlers, Prisma + PostgreSQL, `jose` JWTs, Redux Toolkit + RTK Query, Mailchimp Transactional, shadcn/ui.

## Global Constraints

- **No test runner exists** in this project (per `CLAUDE.md`). All verification is **manual** — `curl` against `pnpm dev` and browser checks. Do NOT add a test framework.
- Type errors do NOT fail the build (`next.config.mjs` sets `typescript.ignoreBuildErrors: true`). Rely on `tsc`/editor, not `pnpm build`, for type checking.
- Prisma client is gitignored under `lib/generated/prisma/`. If schema/client is stale, run `pnpm db:generate` first. (No schema change in this plan.)
- Always import the singleton `prisma` from `@/lib/prisma`.
- Public (unauthenticated) API routes must be allowlisted in **both** `proxy.ts` (`publicApiPaths`) and `lib/redux/services/libraryApi.ts` (`PUBLIC_AUTH_ENDPOINTS`).
- Email-existence must not leak: resend follows the same "always return success" pattern as `forgotPassword()`.
- Existing DB users are already `is_verified = true` (confirmed by owner) — **no backfill task**. Task 5 only future-proofs the seed scripts.
- Dev base URL for email links is the ngrok URL already used in `signup()`/`forgotPassword()`: `https://unnational-impermeably-ilse.ngrok-free.dev`.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `lib/db/types.ts` | Shared API/response types | Add `needsVerification?` to `ApiResponse` |
| `lib/db/auth.ts` | Auth DAL (login/signup/reset/confirm) | Add `is_verified` gate in `login()`; add `getBaseUrl()` helper; add `resendConfirmation()`; refactor `signup()`/`forgotPassword()` to use the helper |
| `app/api/auth/login/route.ts` | Login HTTP handler | Map unverified → `403 + needsVerification` |
| `app/api/auth/refresh/route.ts` | Token refresh HTTP handler | Carry `isVerified` in rebuilt `sessionUser` |
| `app/api/auth/resend-confirmation/route.ts` | **New** public endpoint | Accept `{ email }`, call `resendConfirmation()` |
| `proxy.ts` | Edge auth gate | Allowlist resend endpoint in `publicApiPaths` |
| `lib/redux/services/libraryApi.ts` | RTK Query client | Add `resendConfirmation` mutation; allowlist endpoint in `PUBLIC_AUTH_ENDPOINTS` |
| `components/log-in-form.tsx` | Login UI | Show resend button on `needsVerification` |
| `prisma/admin-seed.ts`, `prisma/sample-seed.ts` | Seed scripts | Set `is_verified: true` on created users |

---

## Task 1: Login gate on `is_verified`

The core fix. After password verification passes, reject unverified users before any token is issued.

**Files:**
- Modify: `lib/db/types.ts` (the `ApiResponse` interface)
- Modify: `lib/db/auth.ts:48` (inside `login()`, between password check and `sessionUser`)
- Modify: `app/api/auth/login/route.ts:32` (before the final 401 return)

**Interfaces:**
- Produces: `login()` may now return `{ success: false, error: string, needsVerification: true }`. The login route emits HTTP **403** with body `{ success: false, error, needsVerification: true }` for this case (distinct from **401** for bad credentials).

- [ ] **Step 1: Add `needsVerification` to the response type**

In `lib/db/types.ts`, extend `ApiResponse`:

```ts
export interface ApiResponse<T> {
    success: boolean
    user: T
    accessToken: string
    error?: string
    needsVerification?: boolean
}
```

- [ ] **Step 2: Add the gate in `login()`**

In `lib/db/auth.ts`, inside `login()`, insert the check immediately after the password verification block (after the `if (!await verifyPassword(...))` block at line 44-46) and before `const sessionUser: SessionUser = {` (line 48):

```ts
        if (!user.is_verified) {
            return {
                success: false,
                error: "Please confirm your email before logging in.",
                needsVerification: true,
            }
        }
```

- [ ] **Step 3: Map the unverified case to 403 in the login route**

In `app/api/auth/login/route.ts`, add a branch before the existing final `return ... { status: 401 }`:

```ts
        if (result.needsVerification) {
            return NextResponse.json(
                { success: false, error: result.error, needsVerification: true },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 401 }
        )
```

- [ ] **Step 4: Manually verify the gate**

Start the dev server (`pnpm dev`). Pick a real user email and toggle it unverified, then test both states:

```bash
# Force the test account unverified
psql "$DATABASE_URL" -c "UPDATE users SET is_verified=false WHERE email='you@ispmyanmar.com';"

# Expect HTTP 403 and needsVerification:true
curl -i -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@ispmyanmar.com","password":"<correct-password>"}'

# Wrong password on the SAME unverified account must still be 401, NOT the verify message
curl -i -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@ispmyanmar.com","password":"definitely-wrong"}'

# Restore and confirm login now succeeds (HTTP 200, accessToken present)
psql "$DATABASE_URL" -c "UPDATE users SET is_verified=true WHERE email='you@ispmyanmar.com';"
curl -i -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@ispmyanmar.com","password":"<correct-password>"}'
```

Expected: 403 + `"needsVerification":true` (correct pw, unverified); 401 + `"Invalid password"` (wrong pw); 200 + `accessToken` (verified).

- [ ] **Step 5: Commit**

```bash
git add lib/db/types.ts lib/db/auth.ts app/api/auth/login/route.ts
git commit -m "fix(auth): block unverified users at login"
```

---

## Task 2: Carry `isVerified` through token refresh

The refresh route rebuilds `sessionUser` without `isVerified`, dropping the claim from the access token after the first 15-minute cycle. Add it back for consistency.

**Files:**
- Modify: `app/api/auth/refresh/route.ts:46-54` (the `sessionUser` object)

**Interfaces:**
- Consumes: nothing new.
- Produces: refreshed access tokens now include the `isVerified` claim.

- [ ] **Step 1: Add `isVerified` to the rebuilt session user**

In `app/api/auth/refresh/route.ts`, add the field to the `sessionUser` object (after `isAdmin: user.is_admin,`):

```ts
        const sessionUser: SessionUser = {
            id: user.id,
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            isAdmin: user.is_admin,
            isVerified: user.is_verified,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }
```

- [ ] **Step 2: Manually verify the refresh response**

With `pnpm dev` running, log in via the app (or curl) to obtain a refresh cookie, then hit refresh and confirm the user payload is returned:

```bash
# Use the refresh_token cookie from a prior login (replace <token>)
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H 'Cookie: refresh_token=<token>' | grep -o '"isVerified":[a-z]*'
```

Expected: `"isVerified":true` present in the response user. (The claim is informational; the authoritative gate remains `login()` in Task 1.)

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/refresh/route.ts
git commit -m "fix(auth): preserve isVerified claim across token refresh"
```

---

## Task 3: Resend-confirmation backend

New public endpoint + DAL function reusing the existing confirm token and Mailchimp helper. Includes a small DRY refactor of the duplicated base-URL logic.

**Files:**
- Modify: `lib/db/auth.ts` (add `getBaseUrl()` helper; add `resendConfirmation()`; refactor `signup()` and `forgotPassword()` to use the helper)
- Create: `app/api/auth/resend-confirmation/route.ts`
- Modify: `proxy.ts:92` (`publicApiPaths`)

**Interfaces:**
- Consumes: `getUserByEmail` (from `./client`), `generateAccountConfirmToken` (from `./auth-tokens`), `sendConfirmationMail(to: string, confirmationUrl: string)` (from `../email`) — all already imported in `lib/db/auth.ts`.
- Produces: `resendConfirmation(email: string): Promise<{ success: boolean; error?: string }>`; `POST /api/auth/resend-confirmation` accepting `{ email: string }` and returning `{ success: boolean; error?: string }`.

- [ ] **Step 1: Add the `getBaseUrl()` helper**

In `lib/db/auth.ts`, add below the `REFRESH_MAX_AGE` constant (line 23):

```ts
function getBaseUrl(): string {
    return process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL!
        : "https://unnational-impermeably-ilse.ngrok-free.dev" // ← real URL for email testing
}
```

- [ ] **Step 2: Use the helper in `signup()` and `forgotPassword()`**

In `signup()`, replace the `BASE_URL` block (lines 217-220) so the URL uses the helper:

```ts
        const confirmationToken = await generateAccountConfirmToken(user.id)
        const confirmationUrl = `${getBaseUrl()}/auth/verify-account?token=${confirmationToken}`
```

In `forgotPassword()`, replace the `BASE_URL` block (lines 253-256):

```ts
        const resetToken = await generateResetToken(user.id)
        const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${resetToken}`
```

- [ ] **Step 3: Add `resendConfirmation()`**

In `lib/db/auth.ts`, add this exported function (place it after `forgotPassword()`):

```ts
/**
 * Resend account confirmation email — only for existing, unverified users.
 * Always returns success when the user is absent or already verified,
 * to avoid leaking account existence/state.
 */
export async function resendConfirmation(
    email: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getUserByEmail(email)

        // Do not reveal whether the account exists or is already verified
        if (!user || user.is_verified) {
            return { success: true }
        }

        const confirmationToken = await generateAccountConfirmToken(user.id)
        const confirmationUrl = `${getBaseUrl()}/auth/verify-account?token=${confirmationToken}`

        const mailConfirm = await sendConfirmationMail(user.email, confirmationUrl)
        if (!mailConfirm.success) {
            console.error("Failed to resend confirmation email:", mailConfirm.error)
            return { success: false, error: "Failed to send confirmation email. Please try again." }
        }

        return { success: true }
    } catch (error) {
        console.error("Resend confirmation error:", error)
        return { success: false, error: "An error occurred. Please try again." }
    }
}
```

- [ ] **Step 4: Create the route handler**

Create `app/api/auth/resend-confirmation/route.ts`:

```ts
import { NextResponse } from "next/server"
import { resendConfirmation } from "@/lib/db/auth"

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { success: false, error: "Email is required" },
                { status: 400 }
            )
        }

        const result = await resendConfirmation(email)

        if (result.success) {
            return NextResponse.json({ success: true })
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
        )
    } catch (error) {
        console.error("Resend confirmation API error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
```

- [ ] **Step 5: Allowlist the endpoint in `proxy.ts`**

In `proxy.ts`, add `/api/auth/resend-confirmation` to the `publicApiPaths` array (line 92):

```ts
        const publicApiPaths = ["/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/auth/refresh", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/account-confirm", "/api/auth/resend-confirmation"]
```

- [ ] **Step 6: Manually verify the endpoint**

With `pnpm dev` running:

```bash
# Unverified user → should send mail, return {"success":true}
psql "$DATABASE_URL" -c "UPDATE users SET is_verified=false WHERE email='you@ispmyanmar.com';"
curl -i -s -X POST http://localhost:3000/api/auth/resend-confirmation \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@ispmyanmar.com"}'

# Unknown email → still {"success":true} (no enumeration), no mail sent
curl -i -s -X POST http://localhost:3000/api/auth/resend-confirmation \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@ispmyanmar.com"}'

# Missing email → 400
curl -i -s -X POST http://localhost:3000/api/auth/resend-confirmation \
  -H 'Content-Type: application/json' -d '{}'

psql "$DATABASE_URL" -c "UPDATE users SET is_verified=true WHERE email='you@ispmyanmar.com';"
```

Expected: 200 `{"success":true}` for both the unverified and unknown email; a real confirmation email arrives only for the unverified real account; 400 for missing email. Confirm the route is reachable without auth (not a 401 from `proxy.ts`).

- [ ] **Step 7: Commit**

```bash
git add lib/db/auth.ts app/api/auth/resend-confirmation/route.ts proxy.ts
git commit -m "feat(auth): add resend-confirmation endpoint"
```

---

## Task 4: Client wiring — resend mutation + login UI

Expose the endpoint through RTK Query and surface a resend button when login returns `needsVerification`.

**Files:**
- Modify: `lib/redux/services/libraryApi.ts` (`PUBLIC_AUTH_ENDPOINTS` list; new mutation; export hook)
- Modify: `components/log-in-form.tsx`

**Interfaces:**
- Consumes: `403 + { needsVerification: true }` from the login route (Task 1); `POST /api/auth/resend-confirmation` (Task 3).
- Produces: `useResendConfirmationMutation()` hook returning `{ success: boolean }`.

- [ ] **Step 1: Allowlist the endpoint for reauth-skip**

In `lib/redux/services/libraryApi.ts`, add the endpoint to `PUBLIC_AUTH_ENDPOINTS` (lines 30-35):

```ts
const PUBLIC_AUTH_ENDPOINTS = [
    "api/auth/login",
    "api/auth/signup",
    "api/auth/logout",
    "api/auth/refresh",
    "api/auth/resend-confirmation",
]
```

- [ ] **Step 2: Add the `resendConfirmation` mutation**

In `lib/redux/services/libraryApi.ts`, add this endpoint inside `endpoints: (builder) => ({ ... })`, immediately after the `refresh` mutation (after line 349):

```ts
        resendConfirmation: builder.mutation<{ success: boolean }, { email: string }>({
            query: (body) => ({
                url: "api/auth/resend-confirmation",
                method: "POST",
                body,
            }),
        }),
```

- [ ] **Step 3: Export the generated hook**

In the `export const { ... } = libraryApi` block (lines 378+), add `useResendConfirmationMutation` next to `useLoginMutation`:

```ts
    useLoginMutation,
    useResendConfirmationMutation,
```

- [ ] **Step 4: Wire the login form**

In `components/log-in-form.tsx`:

(a) Extend the hook import (line 17):

```ts
import { useLoginMutation, useLogoutMutation, useResendConfirmationMutation } from "@/lib/redux/services/libraryApi"
```

(b) Add state + the resend mutation hook near the other hooks (after line 39):

```ts
    const [needsVerification, setNeedsVerification] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState("")
    const [resendConfirmation, { isLoading: isResending }] = useResendConfirmationMutation()
```

(c) Set the flag in the login error handler. Replace the error callback in `onSubmit` (lines 87-90):

```ts
        }, (error) => {
            if (error?.data?.needsVerification) {
                setNeedsVerification(true)
                setUnverifiedEmail(values.email)
            }
            toast.error(error.data.error)
            setError(error.data.error)
        })
```

(d) Add the resend handler (above the `return`):

```ts
    async function handleResend() {
        try {
            await resendConfirmation({ email: unverifiedEmail }).unwrap()
            toast.success("Confirmation email sent. Check your inbox.")
        } catch {
            toast.error("Could not resend confirmation email. Please try again.")
        }
    }
```

(e) Render the resend button. Insert immediately after the existing `{error && ( ... )}` block (after line 134):

```tsx
                {needsVerification && (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleResend}
                        disabled={isResending}
                    >
                        {isResending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            "Resend confirmation email"
                        )}
                    </Button>
                )}
```

- [ ] **Step 5: Manually verify the UI flow**

With `pnpm dev` running and the test account set unverified (`UPDATE users SET is_verified=false ...`):

1. Open `/auth/login`, enter the unverified account's correct email + password, submit.
2. Expected: error toast with the verify message, and a "Resend confirmation email" button appears.
3. Click resend → success toast; a confirmation email arrives.
4. Click the link (verifies the account), return to `/auth/login`, sign in → redirects to `callbackUrl`.
5. Restore: `UPDATE users SET is_verified=true ...` if you didn't complete the email step.

- [ ] **Step 6: Commit**

```bash
git add lib/redux/services/libraryApi.ts components/log-in-form.tsx
git commit -m "feat(auth): resend confirmation from login when unverified"
```

---

## Task 5: Future-proof seed scripts

Seed users are created with `is_verified` defaulting to `false`. With the Task 1 gate live, a freshly reseeded admin would be locked out. Set them verified on create.

**Files:**
- Modify: `prisma/admin-seed.ts:19-24`
- Modify: `prisma/sample-seed.ts:14-19` and `:26-31`

**Interfaces:** none (standalone scripts).

- [ ] **Step 1: Mark the admin-seed user verified**

In `prisma/admin-seed.ts`, add `is_verified: true` to the `create` block:

```ts
        create: {
            username: username,
            email: email,
            password: adminPassword,
            is_admin: true,
            is_verified: true,
        },
```

- [ ] **Step 2: Mark both sample-seed users verified**

In `prisma/sample-seed.ts`, add `is_verified: true` to the admin `create` block:

```ts
        create: {
            username: "Admin",
            email: "admin@library.com",
            password: adminPassword,
            is_admin: true,
            is_verified: true,
        },
```

…and to the regular-user `create` block:

```ts
        create: {
            username: "John Doe",
            email: "user@library.com",
            password: userPassword,
            is_admin: false,
            is_verified: true,
        },
```

- [ ] **Step 3: Manually verify against a throwaway DB**

Only if a disposable database is available (this wipes data):

```bash
pnpm db:reset   # migrate reset --force + reseed
psql "$DATABASE_URL" -c "SELECT email, is_verified FROM users;"
```

Expected: seeded users show `is_verified = t`. Then confirm `admin@library.com / admin123` logs in successfully. If no throwaway DB is available, skip the run and rely on code review of the three `create` blocks.

- [ ] **Step 4: Commit**

```bash
git add prisma/admin-seed.ts prisma/sample-seed.ts
git commit -m "chore(seed): mark seeded users verified"
```

---

## Self-Review

**Spec coverage:**
- R1 (login rejects unverified, no tokens issued) → Task 1, Step 2 returns before `sessionUser`/token generation. ✓
- R2 (distinguishable from bad creds) → Task 1, Step 3 (403 + `needsVerification` vs 401). ✓
- R3 (existing users not locked out) → owner confirmed existing rows already `is_verified=true`; Task 5 prevents future seed lockout. ✓
- R4 (enforced across refresh) → gate at login means unverified users never get a refresh token; Task 2 keeps the claim consistent. ✓
- Resend feature (in-scope per owner) → Tasks 3 + 4. ✓
- Edge case "wrong password on unverified account stays 401" → Task 1, Step 4 asserts it. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code step contains literal code. ✓

**Type consistency:** `needsVerification` defined on `ApiResponse` (Task 1.1), returned by `login()` (1.2), read as `result.needsVerification` in the route (1.3), emitted in the 403 body (1.3), read as `error.data.needsVerification` in the client (4.4). `resendConfirmation(email)` signature matches DAL (3.3), route call (3.4), and mutation body `{ email }` (4.2). Hook name `useResendConfirmationMutation` consistent (4.3/4.4a). ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-email-verification-login-gate.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?
