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
