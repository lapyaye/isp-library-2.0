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
