import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
    verifyRefreshToken,
    generateAccessToken,
    generateRefreshToken
} from "@/lib/db/auth-tokens"
import { prisma } from "@/lib/prisma"
import { setSession, clearSession, REFRESH_TOKEN_COOKIE } from "@/lib/db/auth"
import { SessionUser } from "@/lib/db/types"

export async function POST() {
    try {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

        if (!refreshToken) {
            return NextResponse.json({ error: "Refresh token missing" }, { status: 401 })
        }

        // Verify JWT
        const decoded = await verifyRefreshToken(refreshToken)
        if (!decoded) {
            await clearSession()
            return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 })
        }
        // Find user by ID only, because the token might have just been rotated
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        })

        if (!user || !user.refresh_token) {
            await clearSession()
            return NextResponse.json({ error: "Refresh token revoked or not found" }, { status: 401 })
        }

        const isTokenMatch = user.refresh_token === refreshToken
        const rotationThreshold = 60 * 1000 // 60 seconds
        const isRecentlyRotated = (Date.now() - new Date(user.updated_at).getTime()) < rotationThreshold

        if (!isTokenMatch && !isRecentlyRotated) {
            await clearSession()
            return NextResponse.json({ error: "Refresh token revoked or not found" }, { status: 401 })
        }

        const sessionUser: SessionUser = {
            id: user.id,
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            isAdmin: user.is_admin,
            isVerified: user.is_verified,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }

        // Generate new access token
        const newAccessToken = await generateAccessToken(sessionUser)

        // GRACE PERIOD logic applied
        let newRefreshToken = user.refresh_token
        if (isTokenMatch) {
            newRefreshToken = await generateRefreshToken(sessionUser)
            // Update DB with new refresh token
            await prisma.user.update({
                where: { id: user.id },
                data: { refresh_token: newRefreshToken }
            })
        }

        const response = NextResponse.json({
            success: true,
            accessToken: newAccessToken,
            user: sessionUser
        })

        await setSession(newRefreshToken)

        return response
    } catch (error) {
        console.error("Refresh error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
