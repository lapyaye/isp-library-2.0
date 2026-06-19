# Spec: Enforce email verification at login

**Status:** Proposed
**Type:** Bug fix (security / auth)
**Date:** 2026-06-19
**Owner:** Htun Aung Kyaw

## 1. Problem

A newly registered user must confirm their account via an email link. The
confirmation email is sent, and the link works — but the user can log in
**before** clicking it. Email confirmation is effectively optional.

## 2. Root cause

`login()` never reads `is_verified`. The flag is correct everywhere else; the
enforcement point is simply missing.

- `User.is_verified` defaults to `false` (`prisma/schema.prisma`).
- `signup()` sends the confirmation email but blocks nothing (`lib/db/auth.ts:196`).
- `accountConfirm()` flips it to `true` (`lib/db/auth.ts:329`).
- `login()` runs `getUserByEmail → bcrypt.compare → issue tokens` with **no
  `is_verified` check** between password verification (`lib/db/auth.ts:44`) and
  token issuance (`lib/db/auth.ts:60`).

No other layer compensates:
- `proxy.ts` `effectiveUser` carries only `isAdmin` (`proxy.ts:39`); no verify check.
- `getSession()` does not check it (`lib/db/auth.ts:82`).
- The login response includes `isVerified` and it reaches Redux, but nothing
  reads it to block.

## 3. Goal / Non-goals

**Goal:** Unverified users cannot obtain a session. Login is rejected with a
clear, actionable message until the account is confirmed.

**Non-goals:**
- Building a "resend confirmation email" endpoint/UI (future; see Open questions).
- Changing token lifetimes, password hashing, or the confirmation email flow.
- Email enumeration hardening on login (tracked separately).

## 4. Requirements

- **R1** — `login()` rejects any user whose `is_verified` is `false`, after
  password verification succeeds, before issuing tokens. No access or refresh
  token is generated; no refresh cookie is set; the DB `refresh_token` is not
  rotated.
- **R2** — The rejection is distinguishable from "wrong credentials" so the UI
  can show a verification-specific message.
- **R3** — Existing already-active users (including admins and seeded users)
  must **not** be locked out by this change.
- **R4** — The verification state must remain enforced across token refresh
  (a refreshed session cannot resurrect an unverified user).

## 5. Design

### 5.1 Login gate (primary — satisfies R1, R2)

In `login()` (`lib/db/auth.ts:32`), after `verifyPassword` passes and before
`generateAccessToken`:

```
if (!user.is_verified) {
    return { success: false, error: "Please confirm your email before logging in.", needsVerification: true }
}
```

DB is the source of truth here, so the gate cannot be spoofed by a forged token
and is naturally enforced on every fresh login.

`login/route.ts` maps this to **HTTP 403** with body
`{ success: false, error, needsVerification: true }`, distinct from the existing
**401** used for bad credentials (`app/api/auth/login/route.ts:32`).

`ApiResponse` / the login return type gains an optional `needsVerification?: boolean`
(`lib/db/types.ts`).

### 5.2 Refresh consistency (satisfies R4)

The gate lives at login, so an unverified user never gets a refresh token in the
first place — R4 holds for the normal path. For correctness of the token claim,
also include `isVerified` in the `sessionUser` rebuilt by the refresh route,
which currently omits it (`app/api/auth/refresh/route.ts:46-54`).

### 5.3 Backfill existing users (satisfies R3) — REQUIRED

Because `is_verified` defaults to `false` and the seed scripts never set it, all
current rows are `false`. Shipping the gate without a backfill locks everyone
out, including admin.

- One-time data migration marking all pre-existing users verified:
  `UPDATE users SET is_verified = true WHERE is_verified = false;`
  (run as a Prisma migration or a manual SQL step at deploy).
- Fix seed scripts to set `is_verified: true` so future seeds aren't locked out:
  - `prisma/admin-seed.ts` (`create` block, `lib/db/auth.ts`-style)
  - `prisma/sample-seed.ts`

### 5.4 Client UX (optional, supports R2)

`components/log-in-form.tsx` already surfaces `error.data.error` via toast, so
the message appears with no change. Optional enhancement: when
`needsVerification` is true, show a dedicated "check your inbox" state instead of
a generic error toast. Deferred unless requested.

## 6. Edge cases

- **Wrong password on an unverified account** → still returns the credentials
  error (401), not the verification message. Password check runs first; do not
  leak verification status to someone who failed auth.
- **Already-verified user** → unaffected, logs in normally.
- **Account confirmation flow** (`accountConfirm`) → unchanged; it already
  issues tokens after setting `is_verified = true`.
- **Reset password** → unchanged; only verified users reach login anyway.

## 7. Verification plan (manual — no test runner in this project)

1. Fresh signup with a new `@ispmyanmar.com` email. Do **not** click the email link.
2. Attempt login → expect **403**, `needsVerification: true`, toast shown, no
   refresh cookie set, no `refresh_token` written in DB.
3. Click the confirmation link (`accountConfirm`) → `is_verified` becomes true.
4. Login again → success, tokens issued, redirect to `callbackUrl`.
5. Existing/seeded admin user (post-backfill) → login still succeeds.
6. Refresh after login (wait > access TTL or force a 401) → session persists and
   carries `isVerified`.

## 8. Files touched

| File | Change |
|------|--------|
| `lib/db/auth.ts` | `login()` gate on `is_verified` |
| `app/api/auth/login/route.ts` | 403 + `needsVerification` for unverified |
| `lib/db/types.ts` | optional `needsVerification` on response type |
| `app/api/auth/refresh/route.ts` | include `isVerified` in rebuilt `sessionUser` |
| `prisma/admin-seed.ts`, `prisma/sample-seed.ts` | set `is_verified: true` |
| migration / SQL | one-time backfill of existing rows |
| `components/log-in-form.tsx` | (optional) verification-specific UX |

## 9. Open questions

- **Resend confirmation email** — do we add a resend endpoint + button now, or
  defer? Current confirm token reuses `RESET_TOKEN_EXPIRY` (15m), so a user who
  waits too long has no recovery path without resend. Recommend a follow-up.
- **Backfill mechanism** — Prisma migration vs. manual SQL at deploy. Recommend
  a migration so it is reproducible across environments.
