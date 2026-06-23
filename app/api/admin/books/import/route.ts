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
        return NextResponse.json({ success: false, error: error?.toString() }, { status: 500 })
    }
}
