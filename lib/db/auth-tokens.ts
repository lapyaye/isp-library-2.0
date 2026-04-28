import { SignJWT, jwtVerify } from "jose"
import { SessionUser } from "./types"

const JWT_ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET || "access-secret-at-least-32-chars-long-123"
)
const JWT_REFRESH_SECRET = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || "refresh-secret-at-least-32-chars-long-123"
)
const JWT_RESET_SECRET = new TextEncoder().encode(
    process.env.JWT_RESET_SECRET || "reset-secret-at-least-32-chars-long-1234"
)

export const ACCESS_TOKEN_EXPIRY = "15m"
export const REFRESH_TOKEN_EXPIRY = "7d"
export const RESET_TOKEN_EXPIRY = "15m"

export async function generateAccessToken(user: SessionUser): Promise<string> {
    return await new SignJWT({ ...user })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(JWT_ACCESS_SECRET)
}

export async function generateRefreshToken(user: SessionUser): Promise<string> {
    return await new SignJWT({ userId: user.id, isAdmin: user.isAdmin })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(JWT_REFRESH_SECRET)
}

export async function generateResetToken(userId: string): Promise<string> {
    return await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(RESET_TOKEN_EXPIRY)
        .sign(JWT_RESET_SECRET)
}

export async function generateAccountConfirmToken(email: string, userId: string): Promise<string> {
    return await new SignJWT({ email, userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(RESET_TOKEN_EXPIRY)
        .sign(JWT_RESET_SECRET)
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET)
        return payload as unknown as SessionUser
    } catch (error: any) {
        console.error('Access Token Verification failed:', error.code);
        return null
    }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string, isAdmin?: boolean } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
        return payload as unknown as { userId: string, isAdmin?: boolean }
    } catch (error: any) {
        console.error('Refresh Token Verification failed:', error.code);
        return null
    }
}

export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_RESET_SECRET)
        return payload as unknown as { userId: string }
    } catch (error: any) {
        console.error('Reset Token Verification failed:', error.code);
        return null
    }
}

export async function verifyAccountConfirmToken(token: string): Promise<{ email: string, userId: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_RESET_SECRET)
        console.log("payload", payload);
        return payload as unknown as { email: string, userId: string }
    } catch (error: any) {
        console.error('Account Confirm Token Verification failed:', error.code);
        return null
    }
}