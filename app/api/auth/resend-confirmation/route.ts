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
