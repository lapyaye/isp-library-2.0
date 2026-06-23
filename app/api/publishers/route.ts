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
        return NextResponse.json({ success: false, error: error?.toString() }, { status: 500 })
    }
}
