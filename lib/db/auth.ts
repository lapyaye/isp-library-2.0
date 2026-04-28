// Authentication Module (Prisma-backed)

import { cookies } from "next/headers"
import { ApiResponse, SessionUser } from "./types"
import { getUserByEmail, getUserById } from "./client"
import * as bcrypt from "bcryptjs"
import {
    generateAccessToken,
    generateAccountConfirmToken,
    generateRefreshToken,
    generateResetToken,
    verifyAccessToken,
    verifyAccountConfirmToken,
    verifyRefreshToken,
    verifyResetToken
} from "./auth-tokens"
import { sendConfirmationMail, sendPasswordResetEmail } from "../email"
import { prisma } from "../prisma"

export const REFRESH_TOKEN_COOKIE = "refresh_token"

// 15 minutes for access token, 7 days for refresh token
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
    return await bcrypt.compare(inputPassword, storedPassword)
}

/**
 * Login user with email and password
 */
export async function login(
    email: string,
    password: string
): Promise<Partial<ApiResponse<SessionUser>>> {
    try {
        const user = await getUserByEmail(email)

        if (!user) {
            return { success: false, error: "User not found" }
        }

        const storedPassword = user.password || ""
        if (!await verifyPassword(password.trim(), storedPassword.trim())) {
            return { success: false, error: "Invalid password" }
        }

        const sessionUser: SessionUser = {
            id: user.id,
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            isAdmin: user.is_admin || false,
            isVerified: user.is_verified,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }

        // Generate tokens
        const accessToken = await generateAccessToken(sessionUser)
        const refreshToken = await generateRefreshToken(sessionUser)

        // Store refresh token in DB -> rotate refresh token
        await prisma.user.update({
            where: { id: user.id },
            data: { refresh_token: refreshToken }
        })

        // Set cookies
        await setSession(refreshToken)

        return { success: true, user: sessionUser, accessToken }
    } catch (error) {
        console.error("Login error:", error)
        return { success: false, error: "An error occurred during login" }
    }
}

/**
 * Get current session from headers or cookies (server-side)
 */
export async function getSession(): Promise<SessionUser | null> {
    try {
        // Try to get token from Authorization header first (for API routes)
        const bearerToken = await getBearerToken()
        if (bearerToken) {
            const user = await verifyAccessToken(bearerToken)
            if (user) return user
        }

        // Fallback to refresh token cookie (for SSR/Initial Page Load)
        // This allows Server Components to know the user is "logged in" even before
        // the client-side Redux store has fetched a new access token.
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

        if (!refreshToken) {
            return null
        }

        // Verify the refresh token to get user info for SSR
        const refreshPayload = await verifyRefreshToken(refreshToken)
        if (!refreshPayload) {
            return null
        }

        // Fetch user from DB to get full profile (username, email, isAdmin, etc.)
        const user = await getUserById(refreshPayload.userId)
        if (!user) {
            return null
        }

        return user
    } catch {
        return null
    }
}

/**
 * Extract Bearer token from Authorization header
 */
export async function getBearerToken(): Promise<string | null> {
    try {
        const { headers } = await import("next/headers")
        const headerList = await headers()
        const authHeader = headerList.get("Authorization")

        if (authHeader?.startsWith("Bearer ")) {
            return authHeader.substring(7)
        }
        return null
    } catch {
        return null
    }
}

/**
 * Set session cookies (server-side)
 */
export async function setSession(refreshToken: string): Promise<void> {
    const cookieStore = await cookies()

    // We no longer set the access token as a cookie
    /*
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ACCESS_MAX_AGE,
        path: "/",
    })
    */

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: REFRESH_MAX_AGE,
        path: "/",
    })
}

/**
 * Clear session cookies and revoke refresh token (server-side)
 */
export async function clearSession(): Promise<void> {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    if (refreshToken) {
        try {
            // Revoke in DB using updateMany to avoid "Record to update not found" error (P2025)
            // if the token was already cleared by a concurrent request.
            await prisma.user.updateMany({
                where: { refresh_token: refreshToken },
                data: { refresh_token: null }
            })
        } catch (e) {
            console.error("Failed to revoke refresh token:", e)
        }
    }
    cookieStore.delete(REFRESH_TOKEN_COOKIE)
}

/**
 * Check if current user is admin (server-side)
 */
export async function isAdmin(): Promise<boolean> {
    const session = await getSession()
    return session?.isAdmin ?? false
}

/**
 * Signup user with username, email and password
 */
export async function signup(
    username: string,
    email: string,
    password: string
): Promise<Partial<ApiResponse<SessionUser>>> {
    try {
        const existingUser = await getUserByEmail(email)
        if (existingUser) {
            return { success: false, error: "A user with this email already exists" }
        }

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password,
            }
        })

        // Mail Confirmation
        const confirmationToken = await generateAccountConfirmToken(user.email, user.id)
        const BASE_URL = process.env.NODE_ENV === "production"
            ? process.env.NEXT_PUBLIC_APP_URL
            : "https://unnational-impermeably-ilse.ngrok-free.dev" // ← real URL for email testing
        const confirmationUrl = `${BASE_URL}/auth/verify-account?token=${confirmationToken}`

        console.log("confirmationUrl", confirmationUrl);

        const mailConfirm = await sendConfirmationMail(email, confirmationUrl)
        if (!mailConfirm.success) {
            console.error("Failed to send confirmation email:", mailConfirm.error)
            return { success: false, error: "Failed to send confirmation email. Please try again." }
        }

        return { success: true }
    } catch (error) {
        console.error("Signup error:", error)
        return { success: false, error: "An error occurred during signup" }
    }
}

/**
 * Forgot password — generate reset token and send email
 */
export async function forgotPassword(
    email: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getUserByEmail(email)

        // Always return success to avoid leaking user existence
        if (!user) {
            return { success: true }
        }

        const resetToken = await generateResetToken(user.id)
        const BASE_URL = process.env.NODE_ENV === "production"
            ? process.env.NEXT_PUBLIC_APP_URL
            : "https://unnational-impermeably-ilse.ngrok-free.dev" // ← real URL for email testing
        const resetUrl = `${BASE_URL}/auth/reset-password?token=${resetToken}`

        const emailResult = await sendPasswordResetEmail(user.email, resetUrl)

        if (!emailResult.success) {
            console.error("Failed to send reset email:", emailResult.error)
            return { success: false, error: "Failed to send reset email. Please try again." }
        }

        return { success: true }
    } catch (error) {
        console.error("Forgot password error:", error)
        return { success: false, error: "An error occurred. Please try again." }
    }
}

/**
 * Reset password — verify token and update password
 */
export async function resetPassword(
    token: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const payload = await verifyResetToken(token)

        if (!payload) {
            return { success: false, error: "Invalid or expired reset link. Please request a new one." }
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                refresh_token: null, // Invalidate refresh token to force re-login
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Reset password error:", error)
        return { success: false, error: "An error occurred. Please try again." }
    }
}

export async function accountConfirm(
    token: string
): Promise<Partial<ApiResponse<SessionUser>>> {
    try {
        const payload = await verifyAccountConfirmToken(token)

        if (!payload) {
            return { success: false, error: "Invalid or expired account confirmation token." }
        }

        const user = await prisma.user.findFirst({
            where: { id: payload.userId, email: payload.email, is_verified: false }
        })

        if (!user) {
            return { success: false, error: "User not found or already verified" }
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                is_verified: true,
            }
        })

        const sessionUser: SessionUser = {
            id: updatedUser.id,
            user_id: updatedUser.user_id,
            email: updatedUser.email,
            username: updatedUser.username,
            isAdmin: updatedUser.is_admin,
            isVerified: updatedUser.is_verified,
            created_at: updatedUser.created_at.toISOString(),
            updated_at: updatedUser.updated_at.toISOString(),
        }

        // Generate tokens
        const accessToken = await generateAccessToken(sessionUser)
        const refreshToken = await generateRefreshToken(sessionUser)

        // Store refresh token in DB
        await prisma.user.update({
            where: { id: updatedUser.id },
            data: { refresh_token: refreshToken }
        })

        // Set cookies
        await setSession(refreshToken)

        return { success: true, user: sessionUser, accessToken }
    } catch (error) {
        console.error("Account confirm error:", error)
        return { success: false, error: "An error occurred. Please try again." }
    }
}