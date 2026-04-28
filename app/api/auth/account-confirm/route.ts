import { accountConfirm } from "@/lib/db/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { token } = await request.json()

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token is required" },
                { status: 400 }
            )
        }

        const result = await accountConfirm(token)

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.error },
                { status: 400 }
            )
        }

        if (result.success && result.user) {
            return NextResponse.json({
                success: true,
                user: result.user,
                accessToken: result.accessToken
            })
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 401 }
        )
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}