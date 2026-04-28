import { NextResponse } from "next/server"
import { signup } from "@/lib/db/auth"

export async function POST(request: Request) {
    try {
        const { email, hashedPassword, username } = await request.json()

        if (!email || !hashedPassword || !username) {
            return NextResponse.json(
                { success: false, error: "Email, password and username are required" },
                { status: 400 }
            )
        }

        if (!email.endsWith("@ispmyanmar.com")) {
            return NextResponse.json(
                { success: false, error: "Only ispmyanmar email addresses are allowed" },
                { status: 400 }
            )
        }

        const result = await signup(username, email, hashedPassword)

        if (result.success) {
            return NextResponse.json({
                success: true,
            })
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error("Signup API error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
