# Add Books (Admin) — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending final spec review)
**Scope:** Admin-only page to add books to the library catalog — single-book form **and** bulk CSV import with a dry-run preview.

---

## 1. Summary

Admins get a new page at `/admin/books/new` with two tabs:

- **Single** — a form to add one book at a time. Author and publisher use a pick-or-create combobox (select an existing one or type a new name).
- **Bulk Import** — upload a CSV, get a server-validated dry-run preview (valid/invalid rows), then commit the valid rows.

Only authenticated **admins** can add books. The book browse/read paths stay open to all authenticated users.

---

## 2. Goals / Non-goals

### Goals
- Admin can create a single book with all schema fields, choosing or creating its author and publisher.
- Admin can bulk-add books from a CSV keyed on author/publisher **names** (not internal IDs).
- Bulk import is safe: validate first, preview, then commit only valid rows (partial success).
- Reuse existing patterns (DAL, RTK Query, react-hook-form + zod + shadcn Form, `csv-parse`).

### Non-goals (YAGNI)
- Editing or deleting books.
- Cover-image upload.
- Dedupe-on-import (re-importing the same CSV will create duplicates — see §10).
- Author/publisher management UI beyond create-on-the-fly.

---

## 3. Permissions & routing

- **Page** `app/admin/books/new/page.tsx`. Already protected: `proxy.ts` `adminPaths` matches `startsWith("/admin")`, so non-admins are redirected. **No proxy change needed for the page.**
- **API gating decision:** `GET /api/books` must remain open to all authenticated users (catalog browsing), so `/api/books` **cannot** be added to `adminApiPaths` (that gates all methods, including GET). Instead the new **write handlers self-check `isAdmin()`** inside the route — the same pattern already used by `app/api/admin/borrow/route.ts`.
- The bulk route lives under `/api/admin/books/import` for path consistency with other admin endpoints. It also self-checks `isAdmin()` (defense in depth; no reliance on proxy for authz).
- **Entry points:**
  - "Add Book" button on the admin dashboard (`components/admin-dashboard.tsx`).
  - Admin nav link in `components/header.tsx` (and `components/mobile-nav.tsx`) — visible to admins only, like the existing Admin link.

---

## 4. API layer

| Route file | Method | Guard | Request body | Response |
|---|---|---|---|---|
| `app/api/books/route.ts` | **POST** (new; GET already exists) | `isAdmin()` | single book payload (see §6) | `{ success, data: Book }` |
| `app/api/publishers/route.ts` | **GET** (new) | `getSession()` | — | `{ success, data: Publisher[] }` |
| `app/api/admin/books/import/route.ts` | **POST** (new) | `isAdmin()` | `{ csv: string, dryRun: boolean }` | dry-run or commit result (see §7) |

Response envelope follows the existing `ApiReturnResponse<T>` shape (`{ success, data, error? }`).

### Status codes
- `403` non-admin (write routes).
- `400` invalid body / malformed CSV / missing required `title` column.
- `500` unexpected error (caught + `console.error`, matching existing routes).

---

## 5. Data access layer (`lib/db/client.ts`)

New functions, mapping DB rows to frontend types as the existing DAL does:

- `getPublishers(): Promise<Publisher[]>` — mirrors `getAuthors()`.
- `findOrCreateAuthorByName(name): Promise<string>` — returns internal `id`; `findFirst({ where:{ name } })` else `create`. Used by single add.
- `findOrCreatePublisherByName(name): Promise<string>` — same.
- `createBook(data): Promise<Book>` — resolves `authorName`/`publisherName` → internal ids via find-or-create (skip when blank), creates the book, returns the mapped `Book` (reusing the existing book→`Book` mapping shape from `getBooks`).
- `bulkCreateBooks(rows): Promise<{ created: number; errors: { row: number; message: string }[] }>` — see §7. Resolves author/publisher **names in sets** (one create per distinct new name), then `createMany` the books. Writes wrapped in `prisma.$transaction`.

**Note:** `Author.name` and `Publisher.name` are **not** unique in `schema.prisma` (only `author_id`/`publisher_id` are). Therefore `createMany({ skipDuplicates: true })` cannot dedupe by name. Name dedupe is done explicitly: query existing by name-set → create the missing → build a `name → internalId` map (this mirrors the legacy-id map approach in `prisma/seed.ts`).

---

## 6. Validation (`lib/validation/book.ts`)

Shared zod schemas for form + routes.

### `bookSchema` (single add)
- `title`: `string`, required, min 1.
- `language`, `place_of_publication`, `edition`, `class_number`, `source`, `notes`: optional strings (empty → `undefined`/`null`).
- `published_year`, `price`: optional numbers. Raw input normalized via the shared parse util (§8) **before** zod, so `၂၀၁၇` and `5000` both work; non-numeric → `null`.
- `authorName`, `publisherName`: optional strings (combobox value).

### `bookImportRowSchema` (one CSV row)
Same fields, sourced from CSV columns `author` / `publisher` (mapped to `authorName` / `publisherName`). `title` required; everything else optional.

---

## 7. Bulk CSV import (dry-run preview)

### UX (two-step, single endpoint)
1. Admin selects a `.csv` file → client reads text with `FileReader.readAsText`.
2. Client POSTs `{ csv, dryRun: true }`. Server parses + validates, **no writes**, returns the preview.
3. Client renders a `table` of parsed rows with valid/invalid badges and per-row error messages, plus a summary (`parsed`, `valid`, `failed`).
4. Admin clicks "Import N valid rows" → client POSTs `{ csv, dryRun: false }`. Server writes valid rows, returns `{ created, failed, errors }`.
5. Client toasts the result (sonner) and RTK Query invalidates the Book `LIST` tag → catalog refetches.

### Server algorithm (`POST /api/admin/books/import`)
```
1. isAdmin() else 403
2. validate body { csv: string, dryRun: boolean }; else 400
3. rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true })   // csv-parse/sync
4. if 'title' column absent in header -> 400 "missing required column: title"
5. enforce row cap (~5000) and payload size; else 400
6. for each row i:
     normalize published_year / price via parseNumberValue (§8); "" -> null
     bookImportRowSchema.safeParse(row)
       fail -> errors.push({ row: i + 2, message })     // +2 = header line + 1-based index
       ok   -> validRows.push(parsed)                    // carries authorName, publisherName
7. if dryRun:
     return { success, data: { parsed: rows.length, valid: validRows.length,
                               failed: errors.length, errors, preview: validRows } }
8. else (commit) -> bulkCreateBooks(validRows) inside prisma.$transaction:
     a. authorNames  = distinct non-empty authorName in validRows
        existing = author.findMany({ where: { name: { in: authorNames } } })
        createMany the missing authors (auto author_id); re-query -> map name -> internal id
     b. same for publisherNames
     c. payloads = validRows.map(r => resolve names -> ids, coerce numbers, blanks -> null)
        book.createMany({ data: payloads })
     return { success, data: { created, failed: errors.length, errors } }
```

### CSV format (admin-facing)
Header row required. Columns (only `title` required; order-independent because `columns: true`):

```
title, author, publisher, language, place_of_publication, published_year, edition, price, class_number, source, notes
```

- `author` / `publisher` are **names**, find-or-created on commit.
- `published_year` / `price` accept English or Myanmar digits.
- UI shows this column list as a template hint.

### Partial success
Validation errors are collected **before** any write, so invalid rows never abort the transaction; valid rows still commit. This is the agreed behavior.

---

## 8. Shared util (`lib/utils/parse-number.ts`)

Extract `parseNumberValue` (Myanmar-numeral aware) from `prisma/seed.ts` into `lib/utils/parse-number.ts`, exported for reuse by:
- `prisma/seed.ts` (import instead of local copy),
- single-add number coercion,
- CSV import number coercion.

Behavior unchanged: maps Myanmar digits → English, extracts the first numeric block, returns `number | null`.

---

## 9. Frontend components

- `components/ui/combobox.tsx` — reusable pick-or-create combobox built from existing `command.tsx` + `popover.tsx`. Props: options, value, onChange, onCreate (accept a typed name not in the list). Used for author and publisher.
- `components/add-book-form.tsx` — `"use client"`; react-hook-form + `zodResolver(bookSchema)` + shadcn `Form` (mirrors `components/sign-up-form.tsx`). Author/publisher fields use the combobox, fed by `useGetAuthorsQuery` / `useGetPublishersQuery`. Submits via `useAddBookMutation`; sonner toast + form reset on success.
- `components/book-csv-import.tsx` — `"use client"`; file input → read text → dry-run request → preview `table` with valid/invalid badges and error list → "Import N valid rows" button → commit request → result summary + toast.
- `app/admin/books/new/page.tsx` — server component shell rendering shadcn `Tabs`: **Single** (`AddBookForm`) / **Bulk Import** (`BookCsvImport`).

---

## 10. RTK Query (`lib/redux/services/libraryApi.ts`)

- `getPublishers` query → `GET api/publishers`, `transformResponse` to `data`.
- `addBook` mutation → `POST api/books`, `invalidatesTags: [{ type: "Book", id: "LIST" }]`.
- `importBooks` mutation → `POST api/admin/books/import` (body `{ csv, dryRun }`); commit (`dryRun:false`) `invalidatesTags: [{ type: "Book", id: "LIST" }]`. Dry-run responses do not need to invalidate.
- Export the new hooks: `useGetPublishersQuery`, `useAddBookMutation`, `useImportBooksMutation`.

---

## 11. Known limitations

- **No dedupe on import.** `Book` has no natural unique key (only the auto-generated `book_id`), so re-importing the same CSV creates duplicate rows. Out of scope; flagged for a future enhancement (e.g., a unique constraint on `title + author` or an import idempotency key).
- **Name-based author/publisher matching** can create near-duplicate entities from spelling variants (e.g., "U Aung" vs "U  Aung"). Accepted trade-off for the pick-or-create UX. Trimming reduces but does not eliminate this.

---

## 12. Error handling summary

- **Form:** field-level zod errors; sonner toast on API failure.
- **Write routes:** `403` non-admin, `400` invalid input, `500` caught + logged.
- **Bulk:** per-row `{ row, message }` errors returned for both dry-run and commit; transaction protects the valid set; one bad row never blocks the rest.

---

## 13. File change list

**New**
- `app/admin/books/new/page.tsx`
- `app/api/publishers/route.ts`
- `app/api/admin/books/import/route.ts`
- `components/add-book-form.tsx`
- `components/book-csv-import.tsx`
- `components/ui/combobox.tsx`
- `lib/validation/book.ts`
- `lib/utils/parse-number.ts`

**Modified**
- `app/api/books/route.ts` — add `POST` (admin-gated).
- `lib/db/client.ts` — `getPublishers`, `findOrCreate*`, `createBook`, `bulkCreateBooks`.
- `lib/redux/services/libraryApi.ts` — `getPublishers`, `addBook`, `importBooks` + hooks.
- `components/header.tsx`, `components/mobile-nav.tsx` — admin "Add Book" nav link.
- `components/admin-dashboard.tsx` — "Add Book" entry button.
- `prisma/seed.ts` — import `parseNumberValue` from the new shared util.
