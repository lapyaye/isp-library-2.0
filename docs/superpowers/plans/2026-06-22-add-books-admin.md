# Add Books (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins an `/admin/books/new` page to add a single book (form) or bulk-import books from CSV with a server-validated dry-run preview.

**Architecture:** New write paths layer onto existing patterns — DAL funcs in `lib/db/client.ts`, route handlers that self-check `isAdmin()`, RTK Query mutations, and react-hook-form + zod + shadcn UI. Author/publisher are find-or-created by name. Bulk import parses + validates on the server (`csv-parse/sync`), returns a preview on `dryRun`, commits valid rows in a transaction otherwise.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma + PostgreSQL, Redux Toolkit + RTK Query, react-hook-form, zod, shadcn/ui, csv-parse v6, sonner.

## Global Constraints

- Package manager is **pnpm**. Run `pnpm db:generate` before building if Prisma client is missing.
- DAL is the only place that runs Prisma queries; always import the singleton `prisma` from `@/lib/prisma`.
- Path alias `@/*` maps to the repo root.
- `next.config.mjs` ignores TS build errors — type-check with `npx tsc --noEmit`, not `pnpm build`.
- Admin write endpoints self-check `isAdmin()` inside the handler (do NOT add `/api/books` to `adminApiPaths` — that would block public GET browsing).
- Response envelope is `ApiReturnResponse<T>` = `{ success, data, error? }`.
- Author/publisher matching is **by name** (find-or-create). `Author.name` / `Publisher.name` are not unique in the schema, so `createMany skipDuplicates` cannot dedupe them — dedupe explicitly via name-set query.

## Verification Approach (no test runner)

This repo has no test framework. Each task verifies with the strongest check available for its layer:
- **Pure functions** (parse-number, schemas, name-set logic helpers): a committed `npx tsx` assertion script under `scripts/checks/` using `node:assert` — written first (red), then made green.
- **Types:** `npx tsc --noEmit` (must report no NEW errors in touched files).
- **Lint:** `pnpm lint`.
- **DB/Route/UI:** runtime checks — `pnpm dev` + `curl` with an admin bearer token, and browser steps. Manual but concrete (exact commands + expected output given).

To get an admin access token for curl checks: log in through the UI as an admin, then in DevTools run `JSON.parse(...)`-free — read it from the Redux store via the React DevTools, or call `POST /api/auth/login` with admin creds and copy `accessToken` from the JSON response. Export it as `$TOKEN` for the curl steps.

---

### Task 1: Shared Myanmar-numeral parse util

**Files:**
- Create: `lib/utils/parse-number.ts`
- Modify: `prisma/seed.ts:29-52` (remove local copy, import shared)
- Test: `scripts/checks/parse-number.check.ts`

**Interfaces:**
- Produces: `parseNumberValue(val: string): number | null` — maps Myanmar digits → English, extracts first numeric block, else null.

- [ ] **Step 1: Write the failing check**

Create `scripts/checks/parse-number.check.ts`:

```ts
import assert from "node:assert"
import { parseNumberValue } from "../../lib/utils/parse-number"

assert.strictEqual(parseNumberValue("5000"), 5000)
assert.strictEqual(parseNumberValue("၂၀၁၇"), 2017)        // Myanmar digits
assert.strictEqual(parseNumberValue("၅၀၀၀"), 5000)
assert.strictEqual(parseNumberValue("12.5"), 12.5)
assert.strictEqual(parseNumberValue("၃၇၈.၁"), 378.1)       // Myanmar decimal
assert.strictEqual(parseNumberValue("2017 Edition"), 2017) // embedded
assert.strictEqual(parseNumberValue(""), null)
assert.strictEqual(parseNumberValue("   "), null)
assert.strictEqual(parseNumberValue("abc"), null)
console.log("OK parse-number")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/checks/parse-number.check.ts`
Expected: FAIL — `Cannot find module '../../lib/utils/parse-number'`.

- [ ] **Step 3: Implement the util**

Create `lib/utils/parse-number.ts`:

```ts
/**
 * Parse a numeric value from a string, supporting Myanmar (Burmese) digits.
 * Returns the first numeric block found, or null when none.
 */
export function parseNumberValue(val: string): number | null {
  if (!val || val.trim() === "") return null

  const myanmarToEnglishMap: Record<string, string> = {
    "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
    "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
  }

  let englishVal = ""
  for (const char of val) {
    englishVal += myanmarToEnglishMap[char] !== undefined ? myanmarToEnglishMap[char] : char
  }

  const match = englishVal.match(/[0-9]+(\.[0-9]+)?/)
  if (match && match[0]) return Number(match[0])
  return null
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `npx tsx scripts/checks/parse-number.check.ts`
Expected: `OK parse-number`

- [ ] **Step 5: Refactor seed to use the shared util**

In `prisma/seed.ts`: delete the local `parseNumberValue` function (lines ~29-52) and add to the imports at top:

```ts
import { parseNumberValue } from "../lib/utils/parse-number"
```

- [ ] **Step 6: Verify seed still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `prisma/seed.ts` or `lib/utils/parse-number.ts`.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/parse-number.ts scripts/checks/parse-number.check.ts prisma/seed.ts
git commit -m "feat(books): extract Myanmar-numeral parse util, reuse in seed"
```

---

### Task 2: Validation schemas + shared types

**Files:**
- Create: `lib/validation/book.ts`
- Test: `scripts/checks/book-validation.check.ts`

**Interfaces:**
- Consumes: `parseNumberValue` from Task 1.
- Produces:
  - `bookSchema` (server, preprocess-based) — validates a single-book JSON payload.
  - `bookFormSchema` + `BookFormValues` (all-string fields) — for react-hook-form.
  - `bookImportRowSchema` + `BookImportRow` — validates one CSV row (keys `title, author, publisher, ...`).
  - `BookCreateInput` — the payload shape for `createBook` / `addBook` / POST `/api/books`.
  - `ImportRowError = { row: number; message: string }`.
  - `ImportResult = { parsed?: number; valid?: number; created?: number; failed: number; errors: ImportRowError[]; preview?: BookImportRow[] }`.

- [ ] **Step 1: Write the failing check**

Create `scripts/checks/book-validation.check.ts`:

```ts
import assert from "node:assert"
import { bookSchema, bookImportRowSchema } from "../../lib/validation/book"

// bookSchema: title required
assert.strictEqual(bookSchema.safeParse({}).success, false)
assert.strictEqual(bookSchema.safeParse({ title: "" }).success, false)

// bookSchema: numbers coerced (incl. Myanmar), blanks -> null
const ok = bookSchema.safeParse({
  title: "Test", published_year: "၂၀၁၇", price: "5000", authorName: "  U Aung  ", language: "",
})
assert.strictEqual(ok.success, true)
assert.strictEqual(ok.data!.published_year, 2017)
assert.strictEqual(ok.data!.price, 5000)
assert.strictEqual(ok.data!.authorName, "U Aung")   // trimmed
assert.strictEqual(ok.data!.language, null)          // empty -> null

// import row: title required, author/publisher keys present
assert.strictEqual(bookImportRowSchema.safeParse({ title: "" }).success, false)
const row = bookImportRowSchema.safeParse({ title: "B", author: "A", publisher: "P", price: "၁၀၀" })
assert.strictEqual(row.success, true)
assert.strictEqual(row.data!.price, 100)
console.log("OK book-validation")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/checks/book-validation.check.ts`
Expected: FAIL — cannot find module `lib/validation/book`.

- [ ] **Step 3: Implement the schemas**

Create `lib/validation/book.ts`:

```ts
import { z } from "zod"
import { parseNumberValue } from "@/lib/utils/parse-number"

const emptyToNull = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null

const optionalText = z.preprocess(emptyToNull, z.string().nullable().optional())
const optionalNumber = z.preprocess(
  (v) => parseNumberValue(v == null ? "" : String(v)),
  z.number().nullable().optional()
)
const requiredTitle = z.preprocess(
  emptyToNull,
  z.string({ required_error: "Title is required" }).min(1, "Title is required")
)

/** Server schema for POST /api/books (JSON payload). */
export const bookSchema = z.object({
  title: requiredTitle,
  authorName: optionalText,
  publisherName: optionalText,
  language: optionalText,
  place_of_publication: optionalText,
  published_year: optionalNumber,
  edition: optionalText,
  price: optionalNumber,
  class_number: optionalText,
  source: optionalText,
  notes: optionalText,
})

/** Client form schema — all string fields so react-hook-form stays happy. */
export const bookFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  authorName: z.string().trim().optional().default(""),
  publisherName: z.string().trim().optional().default(""),
  language: z.string().trim().optional().default(""),
  place_of_publication: z.string().trim().optional().default(""),
  published_year: z.string().trim().optional().default(""),
  edition: z.string().trim().optional().default(""),
  price: z.string().trim().optional().default(""),
  class_number: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
})
export type BookFormValues = z.infer<typeof bookFormSchema>

/** Server schema for one CSV import row (column names as keys). */
export const bookImportRowSchema = z.object({
  title: requiredTitle,
  author: optionalText,
  publisher: optionalText,
  language: optionalText,
  place_of_publication: optionalText,
  published_year: optionalNumber,
  edition: optionalText,
  price: optionalNumber,
  class_number: optionalText,
  source: optionalText,
  notes: optionalText,
})
export type BookImportRow = z.infer<typeof bookImportRowSchema>

/** Payload accepted by createBook / addBook / POST /api/books. */
export interface BookCreateInput {
  title: string
  authorName?: string | null
  publisherName?: string | null
  language?: string | null
  place_of_publication?: string | null
  published_year?: number | null
  edition?: string | null
  price?: number | null
  class_number?: string | null
  source?: string | null
  notes?: string | null
}

export interface ImportRowError {
  row: number
  message: string
}

export interface ImportResult {
  parsed?: number
  valid?: number
  created?: number
  failed: number
  errors: ImportRowError[]
  preview?: BookImportRow[]
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `npx tsx scripts/checks/book-validation.check.ts`
Expected: `OK book-validation`

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `lib/validation/book.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/validation/book.ts scripts/checks/book-validation.check.ts
git commit -m "feat(books): add book + CSV-row zod schemas and shared types"
```

---

### Task 3: DAL — getPublishers, createBook, bulkCreateBooks

**Files:**
- Modify: `lib/db/client.ts` (add functions; add `Publisher` to the `./types` import if needed — it is already imported)
- Test: `scripts/checks/dal-books.check.ts` (DB-backed; gated on `DATABASE_URL`)

**Interfaces:**
- Consumes: `BookCreateInput`, `BookImportRow` from Task 2; existing `Book`, `Publisher` types.
- Produces:
  - `getPublishers(): Promise<Publisher[]>`
  - `createBook(data: BookCreateInput): Promise<Book | null>`
  - `bulkCreateBooks(rows: BookImportRow[]): Promise<{ created: number }>`

- [ ] **Step 1: Add imports and getPublishers**

In `lib/db/client.ts`, add to the existing `./types` import line the `Publisher` type (it is already listed — confirm `Publisher` is present in the import from `./types`; if not, add it), and add a new import near the top:

```ts
import type { BookCreateInput, BookImportRow } from "@/lib/validation/book"
```

Then, after the Authors section, add:

```ts
// ─── Publishers ─────────────────────────────────────────

export async function getPublishers(): Promise<Publisher[]> {
    const publishers = await prisma.publisher.findMany({ orderBy: { name: "asc" } })
    return publishers.map((p: PrismaPublisher) => ({
        id: p.id,
        publisher_id: p.publisher_id,
        name: p.name,
    }))
}
```

- [ ] **Step 2: Add find-or-create helpers + createBook**

Append to `lib/db/client.ts`:

```ts
// ─── Book writes ────────────────────────────────────────

async function findOrCreateAuthorId(name: string): Promise<string> {
    const existing = await prisma.author.findFirst({ where: { name } })
    if (existing) return existing.id
    const created = await prisma.author.create({ data: { name } })
    return created.id
}

async function findOrCreatePublisherId(name: string): Promise<string> {
    const existing = await prisma.publisher.findFirst({ where: { name } })
    if (existing) return existing.id
    const created = await prisma.publisher.create({ data: { name } })
    return created.id
}

export async function createBook(data: BookCreateInput): Promise<Book | null> {
    try {
        const authorName = data.authorName?.trim()
        const publisherName = data.publisherName?.trim()
        const author_id = authorName ? await findOrCreateAuthorId(authorName) : null
        const publisher_id = publisherName ? await findOrCreatePublisherId(publisherName) : null

        const b = await prisma.book.create({
            data: {
                title: data.title,
                language: data.language ?? null,
                place_of_publication: data.place_of_publication ?? null,
                published_year: data.published_year ?? null,
                edition: data.edition ?? null,
                price: data.price ?? null,
                class_number: data.class_number ?? null,
                source: data.source ?? null,
                notes: data.notes ?? null,
                author_id,
                publisher_id,
            },
            include: { author: true, publisher: true },
        })
        return {
            id: b.id,
            book_id: b.book_id,
            title: b.title,
            author_name: b.author?.name ?? null,
            author_id: b.author_id ?? null,
            language: b.language,
            publisher_name: b.publisher?.name ?? null,
            publisher_id: b.publisher_id ?? null,
            place_of_publication: b.place_of_publication,
            published_year: b.published_year,
            edition: b.edition,
            price: b.price,
            class_number: b.class_number,
            source: b.source,
            notes: b.notes,
            created_at: b.created_at.toISOString(),
        }
    } catch (error) {
        console.error("createBook error:", error)
        return null
    }
}
```

- [ ] **Step 3: Add bulkCreateBooks (name-set dedupe + transaction)**

Append to `lib/db/client.ts`:

```ts
export async function bulkCreateBooks(rows: BookImportRow[]): Promise<{ created: number }> {
    if (rows.length === 0) return { created: 0 }

    return prisma.$transaction(async (tx) => {
        // Resolve distinct author names -> internal ids (create the missing ones once)
        const authorNames = [...new Set(
            rows.map((r) => r.author?.trim()).filter((n): n is string => !!n)
        )]
        const authorMap = new Map<string, string>()
        if (authorNames.length) {
            const existing = await tx.author.findMany({ where: { name: { in: authorNames } } })
            existing.forEach((a) => authorMap.set(a.name, a.id))
            const missing = authorNames.filter((n) => !authorMap.has(n))
            if (missing.length) {
                await tx.author.createMany({ data: missing.map((name) => ({ name })) })
                const refetched = await tx.author.findMany({ where: { name: { in: missing } } })
                refetched.forEach((a) => authorMap.set(a.name, a.id))
            }
        }

        // Same for publishers
        const publisherNames = [...new Set(
            rows.map((r) => r.publisher?.trim()).filter((n): n is string => !!n)
        )]
        const publisherMap = new Map<string, string>()
        if (publisherNames.length) {
            const existing = await tx.publisher.findMany({ where: { name: { in: publisherNames } } })
            existing.forEach((p) => publisherMap.set(p.name, p.id))
            const missing = publisherNames.filter((n) => !publisherMap.has(n))
            if (missing.length) {
                await tx.publisher.createMany({ data: missing.map((name) => ({ name })) })
                const refetched = await tx.publisher.findMany({ where: { name: { in: missing } } })
                refetched.forEach((p) => publisherMap.set(p.name, p.id))
            }
        }

        const payloads = rows.map((r) => {
            const aName = r.author?.trim()
            const pName = r.publisher?.trim()
            return {
                title: r.title,
                language: r.language ?? null,
                place_of_publication: r.place_of_publication ?? null,
                published_year: r.published_year ?? null,
                edition: r.edition ?? null,
                price: r.price ?? null,
                class_number: r.class_number ?? null,
                source: r.source ?? null,
                notes: r.notes ?? null,
                author_id: aName ? authorMap.get(aName) ?? null : null,
                publisher_id: pName ? publisherMap.get(pName) ?? null : null,
            }
        })

        const result = await tx.book.createMany({ data: payloads })
        return { created: result.count }
    })
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `lib/db/client.ts`.

- [ ] **Step 5: DB-backed runtime check (requires a running DB + generated client)**

First ensure the client is generated: `pnpm db:generate`.

Create `scripts/checks/dal-books.check.ts`:

```ts
import assert from "node:assert"
import { createBook, bulkCreateBooks, getPublishers } from "../../lib/db/client"
import { prisma, pool } from "../../lib/prisma"

async function main() {
  const stamp = Date.now()
  const book = await createBook({
    title: `Check Book ${stamp}`,
    authorName: `Check Author ${stamp}`,
    publisherName: `Check Pub ${stamp}`,
    published_year: 2020,
    price: 1234,
  })
  assert.ok(book, "createBook returned a book")
  assert.strictEqual(book!.author_name, `Check Author ${stamp}`)
  assert.strictEqual(book!.published_year, 2020)

  const pubs = await getPublishers()
  assert.ok(pubs.some((p) => p.name === `Check Pub ${stamp}`), "publisher visible")

  // Bulk: two rows sharing one new author -> author created once
  const res = await bulkCreateBooks([
    { title: `Bulk A ${stamp}`, author: `Shared Auth ${stamp}`, publisher: null,
      language: null, place_of_publication: null, published_year: 1999,
      edition: null, price: null, class_number: null, source: null, notes: null },
    { title: `Bulk B ${stamp}`, author: `Shared Auth ${stamp}`, publisher: null,
      language: null, place_of_publication: null, published_year: null,
      edition: null, price: null, class_number: null, source: null, notes: null },
  ])
  assert.strictEqual(res.created, 2)
  const sharedAuthors = await prisma.author.findMany({ where: { name: `Shared Auth ${stamp}` } })
  assert.strictEqual(sharedAuthors.length, 1, "shared author created exactly once")

  console.log("OK dal-books")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
```

Run: `npx tsx scripts/checks/dal-books.check.ts`
Expected: `OK dal-books`. (If `DATABASE_URL` is unset, this will fail to connect — set it / start the DB first. This is the only DB-dependent check.)

- [ ] **Step 6: Lint**

Run: `pnpm lint`
Expected: no new lint errors.

- [ ] **Step 7: Commit**

```bash
git add lib/db/client.ts scripts/checks/dal-books.check.ts
git commit -m "feat(books): add getPublishers, createBook, bulkCreateBooks to DAL"
```

---

### Task 4: API routes — POST /api/books, GET /api/publishers, POST /api/admin/books/import

**Files:**
- Modify: `app/api/books/route.ts` (add `POST`)
- Create: `app/api/publishers/route.ts`
- Create: `app/api/admin/books/import/route.ts`

**Interfaces:**
- Consumes: `createBook`, `getPublishers`, `bulkCreateBooks` (Task 3); `bookSchema`, `bookImportRowSchema`, `BookImportRow`, `ImportRowError` (Task 2); existing `isAdmin`, `getSession` from `@/lib/db/auth`.
- Produces (HTTP):
  - `POST /api/books` → `{ success, data: Book }`
  - `GET /api/publishers` → `{ success, data: Publisher[] }`
  - `POST /api/admin/books/import` → dry-run `{ success, data: { parsed, valid, failed, errors, preview } }` or commit `{ success, data: { created, failed, errors } }`

- [ ] **Step 1: Add POST to app/api/books/route.ts**

Replace the import line and append the handler. Final file:

```ts
import { NextResponse } from "next/server"
import { getBooks, createBook } from "@/lib/db/client"
import { getSession, isAdmin } from "@/lib/db/auth"
import { bookSchema } from "@/lib/validation/book"

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }
        const books = await getBooks()
        return NextResponse.json({ success: true, data: books })
    } catch (error) {
        console.error("Get Books API error:", error)
        return NextResponse.json({ error: error?.toString() }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!(await isAdmin())) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
        }
        const body = await request.json()
        const parsed = bookSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
                { status: 400 }
            )
        }
        const book = await createBook(parsed.data)
        if (!book) {
            return NextResponse.json({ success: false, error: "Failed to create book" }, { status: 500 })
        }
        return NextResponse.json({ success: true, data: book })
    } catch (error) {
        console.error("Create Book API error:", error)
        return NextResponse.json({ error: error?.toString() }, { status: 500 })
    }
}
```

- [ ] **Step 2: Create app/api/publishers/route.ts**

```ts
import { NextResponse } from "next/server"
import { getPublishers } from "@/lib/db/client"
import { getSession } from "@/lib/db/auth"

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }
        const data = await getPublishers()
        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error("Get Publishers API error:", error)
        return NextResponse.json({ error: error?.toString() }, { status: 500 })
    }
}
```

- [ ] **Step 3: Create app/api/admin/books/import/route.ts**

```ts
import { NextResponse } from "next/server"
import { parse } from "csv-parse/sync"
import { isAdmin } from "@/lib/db/auth"
import { bulkCreateBooks } from "@/lib/db/client"
import { bookImportRowSchema, type BookImportRow, type ImportRowError } from "@/lib/validation/book"

const MAX_ROWS = 5000

export async function POST(request: Request) {
    try {
        if (!(await isAdmin())) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const csv = body?.csv
        const dryRun = body?.dryRun !== false // default to safe dry-run

        if (typeof csv !== "string" || csv.trim() === "") {
            return NextResponse.json({ success: false, error: "Missing CSV content" }, { status: 400 })
        }

        let records: Record<string, string>[]
        try {
            records = parse(csv, { columns: true, skip_empty_lines: true, trim: true })
        } catch (e) {
            return NextResponse.json(
                { success: false, error: "Malformed CSV: " + (e as Error).message },
                { status: 400 }
            )
        }

        if (records.length === 0) {
            return NextResponse.json({ success: false, error: "CSV has no data rows" }, { status: 400 })
        }
        if (records.length > MAX_ROWS) {
            return NextResponse.json(
                { success: false, error: `Too many rows (max ${MAX_ROWS})` },
                { status: 400 }
            )
        }
        if (!("title" in records[0])) {
            return NextResponse.json(
                { success: false, error: "Missing required column: title" },
                { status: 400 }
            )
        }

        const errors: ImportRowError[] = []
        const validRows: BookImportRow[] = []
        records.forEach((rec, i) => {
            const parsed = bookImportRowSchema.safeParse(rec)
            if (!parsed.success) {
                errors.push({ row: i + 2, message: parsed.error.issues[0]?.message ?? "Invalid row" })
            } else {
                validRows.push(parsed.data)
            }
        })

        if (dryRun) {
            return NextResponse.json({
                success: true,
                data: {
                    parsed: records.length,
                    valid: validRows.length,
                    failed: errors.length,
                    errors,
                    preview: validRows,
                },
            })
        }

        const { created } = await bulkCreateBooks(validRows)
        return NextResponse.json({
            success: true,
            data: { created, failed: errors.length, errors },
        })
    } catch (error) {
        console.error("Import Books API error:", error)
        return NextResponse.json({ error: error?.toString() }, { status: 500 })
    }
}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors.

- [ ] **Step 5: Runtime check (dev server + curl)**

Start dev: `pnpm dev`. Obtain an admin token (see Verification Approach) and export `TOKEN=<accessToken>`.

Single add:
```bash
curl -s -X POST http://localhost:3000/api/books \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Curl Test Book","authorName":"Curl Author","published_year":"၂၀၂၁"}' | jq
```
Expected: `{ "success": true, "data": { "title": "Curl Test Book", "author_name": "Curl Author", "published_year": 2021, ... } }`

Non-admin / no token returns 403/401:
```bash
curl -s -X POST http://localhost:3000/api/books -H "Content-Type: application/json" -d '{"title":"x"}' -o /dev/null -w "%{http_code}\n"
```
Expected: `401` (proxy blocks missing token).

Import dry-run:
```bash
curl -s -X POST http://localhost:3000/api/admin/books/import \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"dryRun":true,"csv":"title,author,published_year\nGood Book,Some Author,2010\n,No Title,2011"}' | jq
```
Expected: `data.parsed = 2`, `data.valid = 1`, `data.failed = 1`, `errors[0].row = 3`, and no rows written.

Import commit:
```bash
curl -s -X POST http://localhost:3000/api/admin/books/import \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"dryRun":false,"csv":"title,author,published_year\nGood Book,Some Author,2010\n,No Title,2011"}' | jq
```
Expected: `data.created = 1`, `data.failed = 1`.

- [ ] **Step 6: Commit**

```bash
git add app/api/books/route.ts app/api/publishers/route.ts app/api/admin/books/import/route.ts
git commit -m "feat(books): add admin book-create, publishers, and CSV import routes"
```

---

### Task 5: RTK Query endpoints + hooks

**Files:**
- Modify: `lib/redux/services/libraryApi.ts`

**Interfaces:**
- Consumes: `Publisher`, `Book` types (already imported); `BookCreateInput`, `ImportResult` from `@/lib/validation/book`.
- Produces hooks: `useGetPublishersQuery`, `useAddBookMutation`, `useImportBooksMutation`.

- [ ] **Step 1: Add imports**

In `lib/redux/services/libraryApi.ts`, add `Publisher` to the existing import from `"../../db/types"`, and add:

```ts
import type { BookCreateInput, ImportResult } from "@/lib/validation/book"
```

- [ ] **Step 2: Add endpoints**

Inside `endpoints: (builder) => ({ ... })`, after the existing Books queries, add:

```ts
        getPublishers: builder.query<Publisher[], void>({
            query: () => "api/publishers",
            transformResponse: (response: ApiReturnResponse<Publisher[]>) => response.data,
        }),
        addBook: builder.mutation<Book, BookCreateInput>({
            query: (body) => ({
                url: "api/books",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiReturnResponse<Book>) => response.data,
            invalidatesTags: [{ type: "Book", id: "LIST" }],
        }),
        importBooks: builder.mutation<ImportResult, { csv: string; dryRun: boolean }>({
            query: (body) => ({
                url: "api/admin/books/import",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiReturnResponse<ImportResult>) => response.data,
            invalidatesTags: (result, error, arg) =>
                arg.dryRun ? [] : [{ type: "Book", id: "LIST" }],
        }),
```

- [ ] **Step 3: Export hooks**

In the `export const { ... } = libraryApi` block, add:

```ts
    useGetPublishersQuery,
    useAddBookMutation,
    useImportBooksMutation,
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/redux/services/libraryApi.ts
git commit -m "feat(books): add getPublishers, addBook, importBooks RTK Query endpoints"
```

---

### Task 6: Reusable pick-or-create Combobox

**Files:**
- Create: `components/ui/combobox.tsx`

**Interfaces:**
- Consumes: existing `components/ui/command.tsx`, `components/ui/popover.tsx`, `components/ui/button.tsx`, `cn` from `@/lib/utils`.
- Produces: `Combobox` component. Props `{ options: {value:string;label:string}[]; value: string; onChange: (value: string) => void; placeholder?: string; emptyText?: string }`. `value`/`onChange` carry the **name string** (selecting an option or typing a new name both emit the name).

- [ ] **Step 1: Implement the component**

Create `components/ui/combobox.tsx`:

```tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    emptyText?: string
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Select...",
    emptyText = "No results.",
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")

    const trimmed = query.trim()
    const showCreate =
        trimmed.length > 0 &&
        !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())

    const select = (name: string) => {
        onChange(name)
        setOpen(false)
        setQuery("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn(!value && "text-muted-foreground")}>
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search or type new..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        {showCreate && (
                            <CommandGroup>
                                <CommandItem value={`__create__${trimmed}`} onSelect={() => select(trimmed)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create &quot;{trimmed}&quot;
                                </CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem key={o.value} value={o.label} onSelect={() => select(o.label)}>
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === o.label ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {o.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors. (If `cn` is not found, confirm it is exported from `lib/utils.ts` — it is the standard shadcn helper used by other `components/ui/*` files.)

- [ ] **Step 3: Commit**

```bash
git add components/ui/combobox.tsx
git commit -m "feat(books): add reusable pick-or-create combobox"
```

---

### Task 7: Single add-book form

**Files:**
- Create: `components/add-book-form.tsx`

**Interfaces:**
- Consumes: `bookFormSchema`, `BookFormValues`, `BookCreateInput` (Task 2); `parseNumberValue` (Task 1); `useGetAuthorsQuery`, `useGetPublishersQuery`, `useAddBookMutation` (Task 5); `Combobox` (Task 6); shadcn `Form`, `Input`, `Textarea`, `Button`; `toast` from `sonner`.
- Produces: default-exported `AddBookForm` client component.

- [ ] **Step 1: Implement the form**

Create `components/add-book-form.tsx`:

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { bookFormSchema, type BookFormValues, type BookCreateInput } from "@/lib/validation/book"
import { parseNumberValue } from "@/lib/utils/parse-number"
import {
    useGetAuthorsQuery,
    useGetPublishersQuery,
    useAddBookMutation,
} from "@/lib/redux/services/libraryApi"

export default function AddBookForm() {
    const { data: authors = [] } = useGetAuthorsQuery()
    const { data: publishers = [] } = useGetPublishersQuery()
    const [addBook, { isLoading }] = useAddBookMutation()

    const form = useForm<BookFormValues>({
        resolver: zodResolver(bookFormSchema),
        defaultValues: {
            title: "",
            authorName: "",
            publisherName: "",
            language: "",
            place_of_publication: "",
            published_year: "",
            edition: "",
            price: "",
            class_number: "",
            source: "",
            notes: "",
        },
    })

    const onSubmit = async (values: BookFormValues) => {
        const payload: BookCreateInput = {
            title: values.title,
            authorName: values.authorName || null,
            publisherName: values.publisherName || null,
            language: values.language || null,
            place_of_publication: values.place_of_publication || null,
            published_year: parseNumberValue(values.published_year || ""),
            edition: values.edition || null,
            price: parseNumberValue(values.price || ""),
            class_number: values.class_number || null,
            source: values.source || null,
            notes: values.notes || null,
        }
        try {
            const book = await addBook(payload).unwrap()
            toast.success(`Added "${book.title}"`)
            form.reset()
        } catch (err: any) {
            toast.error(err?.data?.error || "Failed to add book")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                                <Input placeholder="Book title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="authorName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Author</FormLabel>
                                <FormControl>
                                    <Combobox
                                        options={authors.map((a) => ({ value: a.author_id, label: a.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select or add author"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="publisherName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Publisher</FormLabel>
                                <FormControl>
                                    <Combobox
                                        options={publishers.map((p) => ({ value: p.publisher_id, label: p.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select or add publisher"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Language</FormLabel>
                                <FormControl><Input placeholder="e.g. Burmese" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="place_of_publication"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Place of publication</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="published_year"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Published year</FormLabel>
                                <FormControl><Input placeholder="e.g. 2017 or ၂၀၁၇" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="edition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Edition</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl><Input placeholder="e.g. 5000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="class_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Class number</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea rows={3} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? "Adding..." : "Add Book"}
                </Button>
            </form>
        </Form>
    )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/add-book-form.tsx
git commit -m "feat(books): add single add-book form with author/publisher combobox"
```

---

### Task 8: Bulk CSV import component (dry-run preview)

**Files:**
- Create: `components/book-csv-import.tsx`

**Interfaces:**
- Consumes: `useImportBooksMutation` (Task 5); `ImportResult` (Task 2); shadcn `Button`, `Table` (`components/ui/table.tsx`), `Badge`; `toast` from `sonner`.
- Produces: default-exported `BookCsvImport` client component.

- [ ] **Step 1: Implement the component**

Create `components/book-csv-import.tsx`:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useImportBooksMutation } from "@/lib/redux/services/libraryApi"
import type { ImportResult } from "@/lib/validation/book"

const TEMPLATE_COLUMNS =
    "title, author, publisher, language, place_of_publication, published_year, edition, price, class_number, source, notes"

export default function BookCsvImport() {
    const [csv, setCsv] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")
    const [preview, setPreview] = useState<ImportResult | null>(null)
    const [importBooks, { isLoading }] = useImportBooksMutation()

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        setCsv(text)
        setFileName(file.name)
        setPreview(null)
    }

    const runDryRun = async () => {
        try {
            const result = await importBooks({ csv, dryRun: true }).unwrap()
            setPreview(result)
        } catch (err: any) {
            toast.error(err?.data?.error || "Failed to read CSV")
        }
    }

    const commit = async () => {
        try {
            const result = await importBooks({ csv, dryRun: false }).unwrap()
            toast.success(`Imported ${result.created ?? 0} book(s)${result.failed ? `, ${result.failed} skipped` : ""}`)
            setPreview(null)
            setCsv("")
            setFileName("")
        } catch (err: any) {
            toast.error(err?.data?.error || "Import failed")
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                CSV columns (only <code>title</code> required): <code>{TEMPLATE_COLUMNS}</code>.
                Author and publisher are matched by name and created if new.
            </p>

            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onFile}
                    className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                />
                <Button type="button" variant="secondary" onClick={runDryRun} disabled={!csv || isLoading}>
                    {isLoading && !preview ? "Checking..." : "Preview"}
                </Button>
            </div>

            {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}

            {preview && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline">Parsed: {preview.parsed ?? 0}</Badge>
                        <Badge variant="default">Valid: {preview.valid ?? 0}</Badge>
                        <Badge variant={preview.failed ? "destructive" : "outline"}>
                            Failed: {preview.failed}
                        </Badge>
                    </div>

                    {preview.preview && preview.preview.length > 0 && (
                        <div className="max-h-72 overflow-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Publisher</TableHead>
                                        <TableHead>Year</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.preview.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{r.title}</TableCell>
                                            <TableCell>{r.author ?? "—"}</TableCell>
                                            <TableCell>{r.publisher ?? "—"}</TableCell>
                                            <TableCell>{r.published_year ?? "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {preview.errors.length > 0 && (
                        <div className="max-h-48 overflow-auto rounded-md border border-destructive/40 p-3">
                            <p className="mb-1 text-sm font-medium text-destructive">Row errors</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {preview.errors.map((e, i) => (
                                    <li key={i}>Row {e.row}: {e.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={commit}
                        disabled={isLoading || (preview.valid ?? 0) === 0}
                    >
                        {isLoading ? "Importing..." : `Import ${preview.valid ?? 0} valid row(s)`}
                    </Button>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors. (Confirm `components/ui/badge.tsx` exports `Badge` — it is present in `components/ui/`.)

- [ ] **Step 3: Commit**

```bash
git add components/book-csv-import.tsx
git commit -m "feat(books): add bulk CSV import with dry-run preview"
```

---

### Task 9: Page, tabs, and navigation entry points

**Files:**
- Create: `app/admin/books/new/page.tsx`
- Modify: `components/admin-dashboard.tsx` (add "Add Book" link/button)
- Modify: `components/header.tsx` (admin nav link)
- Modify: `components/mobile-nav.tsx` (admin nav link)

**Interfaces:**
- Consumes: `AddBookForm` (Task 7), `BookCsvImport` (Task 8), shadcn `Tabs`, `Card`.
- Produces: route `/admin/books/new` (already admin-gated by `proxy.ts` `adminPaths`).

- [ ] **Step 1: Create the page**

Create `app/admin/books/new/page.tsx`:

```tsx
import AddBookForm from "@/components/add-book-form"
import BookCsvImport from "@/components/book-csv-import"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddBooksPage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <h1 className="mb-6 text-2xl font-semibold">Add Books</h1>
            <Tabs defaultValue="single">
                <TabsList>
                    <TabsTrigger value="single">Single</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
                </TabsList>
                <TabsContent value="single">
                    <Card>
                        <CardHeader><CardTitle>New book</CardTitle></CardHeader>
                        <CardContent><AddBookForm /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bulk">
                    <Card>
                        <CardHeader><CardTitle>Import from CSV</CardTitle></CardHeader>
                        <CardContent><BookCsvImport /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
```

- [ ] **Step 2: Add an "Add Book" entry on the admin dashboard**

Open `components/admin-dashboard.tsx`. Add an import for `Link` from `next/link` if not present (`import Link from "next/link"`), and place a button near the top of the dashboard's main returned JSX (e.g., just inside the outer container, before existing content):

```tsx
<div className="mb-6">
    <Button asChild>
        <Link href="/admin/books/new">+ Add Book</Link>
    </Button>
</div>
```

Ensure `Button` is imported (`import { Button } from "@/components/ui/button"`). If the file already imports these, do not duplicate.

- [ ] **Step 3: Add admin nav link in header**

In `components/header.tsx`, in the desktop nav, add a `Plus`-icon import to the existing lucide import line (`import { BookOpen, BookMarked, Search, BarChart3, Library, Shield, Users, Plus } from "lucide-react"`) and add a link inside the `{isAdmin && ( ... )}` block, right after the existing Admin `<Link>`:

```tsx
{isAdmin && (
    <Link
        href="/admin/books/new"
        className="flex items-center shrink-0 gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
    >
        <Plus className="h-4 w-4" />
        Add Book
    </Link>
)}
```

(Place this as a second `{isAdmin && (...)}` block immediately following the existing admin link block at `components/header.tsx:67-75`.)

- [ ] **Step 4: Add admin nav link in mobile nav**

Open `components/mobile-nav.tsx`. Following the existing admin-only link pattern there (mirror however the file gates admin links — it uses the same `isAdmin` selector as the header), add a link to `/admin/books/new` labelled "Add Book". Match the surrounding link markup exactly (same classes/icon usage as the other mobile links).

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors.

- [ ] **Step 6: End-to-end runtime check (browser)**

Start `pnpm dev`. As an **admin** user:
1. Header shows "Add Book"; click it → lands on `/admin/books/new`.
2. **Single tab:** enter a title, pick an existing author and type a new publisher, set year `၂၀၂၂`, submit → success toast, form resets. Visit `/books` → new book appears with the correct author/publisher and year `2022`.
3. **Bulk tab:** upload a CSV with one valid + one title-less row → Preview shows Parsed 2 / Valid 1 / Failed 1 with a row-3 error → click "Import 1 valid row(s)" → success toast. `/books` shows the imported book.

As a **non-admin** user (or logged out): navigating to `/admin/books/new` redirects (login or home). Confirm the "Add Book" nav link is not shown.

- [ ] **Step 7: Commit**

```bash
git add app/admin/books/new/page.tsx components/admin-dashboard.tsx components/header.tsx components/mobile-nav.tsx
git commit -m "feat(books): add /admin/books/new page with tabs and admin nav links"
```

---

## Self-Review Notes

- **Spec coverage:** §3 routing/permissions → Task 4 (handler `isAdmin()`) + Task 9 (page gating, nav). §4 API → Task 4. §5 DAL → Task 3. §6 validation → Task 2. §7 bulk import dry-run → Task 4 (route) + Task 8 (UI). §8 parse util → Task 1. §9 components → Tasks 6–9. §10 RTK → Task 5. §11 limitations → documented (no dedupe; no enforcement task needed). §12 error handling → covered across Tasks 4, 7, 8.
- **Type consistency:** `BookCreateInput` (Task 2) used identically in Tasks 3, 4, 5, 7. `BookImportRow` keys `author`/`publisher` consistent between Task 2 schema, Task 3 `bulkCreateBooks`, Task 4 route, Task 8 preview render. `ImportResult` shape consistent between Task 2, 4, 5, 8. Combobox `value`=name consistent with `createBook` `authorName`/`publisherName`.
