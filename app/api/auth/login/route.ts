import { NextResponse } from "next/server"
import { login } from "@/lib/db/auth"

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required" },
                { status: 400 }
            )
        }

        if (!email.endsWith("@ispmyanmar.com")) {
            return NextResponse.json(
                { success: false, error: "Only ispmyanmar email addresses are allowed" },
                { status: 400 }
            )
        }

        const result = await login(email, password)

        if (result.success && result.user) {
            return NextResponse.json({
                success: true,
                user: result.user,
                accessToken: result.accessToken
            })
        }

        if (result.needsVerification) {
            return NextResponse.json(
                { success: false, error: result.error, needsVerification: true },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 401 }
        )
    } catch (error) {
        console.error("Login API error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
