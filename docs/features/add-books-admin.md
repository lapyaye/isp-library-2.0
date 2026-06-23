# Feature: Add Books (Admin)

A guide to the admin "add books" feature — what it does, how it's wired, and how to work on it.

- **Route:** `/admin/books/new` (admin-only)
- **Branch it shipped on:** `feat/add-books-admin`
- **Design docs:** [spec](../superpowers/specs/2026-06-22-add-books-admin-design.md) · [plan](../superpowers/plans/2026-06-22-add-books-admin.md)

---

## 1. What it does

Lets an **admin** add books to the catalog two ways, on one page with tabs:

1. **Single** — a form for one book. Author and publisher use a *pick-or-create* combobox: choose an existing one or type a new name (created on submit).
2. **Bulk Import** — upload a CSV, get a **dry-run preview** (valid/invalid rows, per-row errors), then commit only the valid rows.

Regular (non-admin) users never see the entry points and are redirected away from the page. Public book browsing is unaffected.

---

## 2. User flow

```
Admin → header / dashboard "Add Book" link → /admin/books/new
  ├─ Single tab
  │    fill form → submit → POST /api/books → toast → form resets
  └─ Bulk Import tab
       pick .csv → Preview (dryRun:true)  → table of valid rows + error list (no writes)
                 → Import N valid rows (dryRun:false) → toast → catalog refetches
```

---

## 3. Architecture & data flow

Follows the project's standard request path (see root `CLAUDE.md`):

```
React component → RTK Query (libraryApi) → /api/* route handler → lib/db DAL → Prisma → PostgreSQL
```

- **Authorization:** the two write endpoints self-check `isAdmin()` as their first statement (mirrors `app/api/admin/borrow/route.ts`). The page itself is gated by `proxy.ts` `adminPaths` (`startsWith("/admin")`). `proxy.ts` was **not** modified.
- **Why `/api/books` isn't in `proxy.ts` `adminApiPaths`:** that list gates *all* methods, which would break public `GET /api/books` browsing. So admin enforcement for the POST lives in the handler, not the proxy.
- **Author/publisher matching is by name** (find-or-create). `Author.name` / `Publisher.name` are not unique in the schema, so bulk dedupe is done explicitly via a name-set query (mirrors `prisma/seed.ts`), not `createMany({ skipDuplicates })`.
- **Numbers** (`published_year`, `price`) are normalized through the shared `parseNumberValue`, which accepts **Myanmar and English digits** (`၂၀၁၇` → `2017`).

---

## 4. File map

**New**
| File | Responsibility |
|---|---|
| `app/admin/books/new/page.tsx` | Page shell, `Tabs` (Single / Bulk Import) inside `Card`s |
| `app/api/publishers/route.ts` | `GET` publishers (any authed user) — feeds the combobox |
| `app/api/admin/books/import/route.ts` | `POST` CSV import (admin); dry-run or commit |
| `components/add-book-form.tsx` | Single-book form (react-hook-form + zod + sonner) |
| `components/book-csv-import.tsx` | CSV upload, dry-run preview table, commit |
| `components/ui/combobox.tsx` | Reusable pick-or-create combobox (Command + Popover) |
| `lib/validation/book.ts` | zod schemas + shared types |
| `lib/utils/parse-number.ts` | Myanmar-numeral-aware number parser (shared) |

**Modified**
| File | Change |
|---|---|
| `app/api/books/route.ts` | Added admin-gated `POST` (GET unchanged) |
| `lib/db/client.ts` | `getPublishers`, `createBook`, `bulkCreateBooks` (+ find-or-create helpers) |
| `lib/redux/services/libraryApi.ts` | `getPublishers`, `addBook`, `importBooks` endpoints + hooks |
| `components/header.tsx`, `components/mobile-nav.tsx`, `components/admin-dashboard.tsx` | Admin "Add Book" nav entries |
| `prisma/seed.ts` | Imports `parseNumberValue` from the shared util |

---

## 5. Key types (`lib/validation/book.ts`)

- `bookSchema` — server validation for `POST /api/books` (preprocess: trim, empty→null, numbers via `parseNumberValue`).
- `bookFormSchema` / `BookFormValues` — all-string fields for react-hook-form; the form converts numbers on submit.
- `bookImportRowSchema` / `BookImportRow` — one CSV row, keyed on column names (`title, author, publisher, ...`).
- `BookCreateInput` — payload for `createBook` / `addBook` / `POST /api/books`.
- `ImportResult` / `ImportRowError` — import response shape (dry-run carries `preview`; commit carries `created`).

---

## 6. Bulk CSV import

### Endpoint
`POST /api/admin/books/import` — body `{ csv: string, dryRun: boolean }`. `dryRun` defaults to the safe value (`true`): a write happens **only** when `dryRun === false`.

### Server algorithm
1. `isAdmin()` → else 403.
2. Parse with `csv-parse/sync`: `{ columns: true, skip_empty_lines: true, trim: true }`.
3. Guards → 400: missing/empty CSV, malformed CSV, no `title` column, >5000 rows, no data rows.
4. Per row: normalize numbers, validate with `bookImportRowSchema`. Invalid rows go to `errors[]` as `{ row, message }` (`row = i + 2`, accounting for the header + 1-based index). Valid rows accumulate.
5. **dry-run:** return `{ parsed, valid, failed, errors, preview }` — **no writes**.
6. **commit:** `bulkCreateBooks(validRows)` inside `prisma.$transaction` → return `{ created, failed, errors }`.

### Partial success
Validation errors are collected *before* any write, so bad rows never abort the transaction; valid rows still commit.

### CSV format (admin-facing)
Header row required; only `title` is required; order-independent (`columns: true`). Author/publisher are **names** (find-or-created on commit):

```
title, author, publisher, language, place_of_publication, published_year, edition, price, class_number, source, notes
```

`published_year` / `price` accept English or Myanmar digits.

---

## 7. Known limitations (by design — see spec §11)

- **No dedupe on import.** `Book` has no natural unique key (only an auto `book_id`), so re-importing the same CSV creates duplicate book rows.
- **Name-based author/publisher matching** can create near-duplicates from spelling/case variants (the columns aren't unique). Trimming reduces but doesn't eliminate this.

If you need either fixed later, candidates: a unique constraint on `title + author`, or an import idempotency key.

---

## 8. Gotchas for the next developer

- **`createBook` is transactional.** Author/publisher find-or-create and the book insert run inside one `prisma.$transaction` so a failed insert can't orphan a freshly created author/publisher. Keep new queries on the `tx` client — a leaked global `prisma.` call inside the transaction silently defeats atomicity.
- **Combobox value is the *name* string**, not an ID. The form stores `authorName` / `publisherName`; the DAL resolves names → internal IDs. Don't wire the combobox to emit `author_id`.
- **Tailwind v4 CSS-var syntax:** use `w-[var(--radix-...)]` or `w-(--radix-...)`. The bare v3 form `w-[--radix-...]` does **not** resolve under v4 (this bit the combobox popover width once).
- **`isAdmin()` before body parse.** In write handlers, call `isAdmin()` first so an unauthorized request is rejected before any work.
- **Generated Prisma client** lives in `lib/generated/prisma` (gitignored). After a fresh clone or schema change run `pnpm db:generate` or imports from `@/lib/generated/prisma/client` fail.

---

## 9. Verify locally

No test runner is configured. Static gates: `npx tsc --noEmit` and `pnpm lint` (or `npx eslint <files>`). A DB-backed sanity script exists at `scripts/checks/dal-books.check.ts` (`npx tsx scripts/checks/dal-books.check.ts` — needs a reachable Postgres).

Runtime smoke test (`pnpm dev`, logged in as an admin):
1. Single add with a Myanmar year (`၂၀၂၂`) → catalog shows `2022`.
2. CSV dry-run with one valid + one title-less row → Parsed 2 / Valid 1 / Failed 1, error on `row 3`; then commit imports the valid one.
3. As a non-admin (or logged out): `/admin/books/new` redirects to login; the "Add Book" nav entries are hidden.
4. Mobile nav "Add Book" closes the sheet after navigating.
