import { NextResponse, type NextRequest } from "next/server"
import { verifyAccessToken, verifyRefreshToken } from "./lib/db/auth-tokens"
import { REFRESH_TOKEN_COOKIE } from "./lib/db/auth"
import { SessionUser } from "./lib/db/types"

export async function proxy(request: NextRequest) {
    // 1. Extract tokens
    // Access Token comes from Authorization header (Bearer token)
    const authHeader = request.headers.get("Authorization")
    let accessToken = authHeader?.startsWith("Bearer ")
        ? authHeader?.substring(7)
        : null

    // Verify access token and get user payload if Access Token is verified successfully
    let user: SessionUser | null = null
    if (accessToken) {
        user = await verifyAccessToken(accessToken)
    }

    // Refresh Token comes from httpOnly cookie
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    let refreshPayload = null

    // Verify refresh token and get the payload(userId and isAdmin) if it succeeds
    if (refreshToken) {
        refreshPayload = await verifyRefreshToken(refreshToken)
    }

    // effectiveUser allows us to evaluate roles on page routes 
    // where accessTokens are not sent in the initial GET request.
    /*  
        If user is not authenticated, effectiveUser will be null
        If user is authenticated, effectiveUser will be the user object
        If refresh token is available and not expired and user is not authenticated, effectiveUser
        will be the object with isAdmin property from refreshPayload which means the refresh
        token is not expired yet. If refresh token is available but expired and user is not
        authenticated, effectiveUser will be null.
    */
    const effectiveUser = user || (refreshPayload ? { isAdmin: refreshPayload.isAdmin || false } : null)

    // Protect routes that require authentication
    const protectedPaths = ["/my-books", "/books", "/analytics", "/authors"]
    const adminPaths = ["/admin", "/admin/details/users", "/admin/details/users/[id]"]
    const redirectPaths = ["/admin/details"]
    const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
    const isAdminPath = adminPaths.some((path) => request.nextUrl.pathname.startsWith(path))
    const isRedirectPath = redirectPaths.some((path) => request.nextUrl.pathname.startsWith(path))

    const needsAuth = isProtectedPath || isAdminPath || isRedirectPath

    // Redirect to login page if protected paths are accessed and user is not authenticated

    if (needsAuth && !effectiveUser) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("callbackUrl", request.nextUrl.pathname)
        // If refresh token is available but expired because effectiveUser is null, set sessionExpired to true
        if (refreshToken) {
            url.searchParams.set("sessionExpired", "true")
        }
        return NextResponse.redirect(url)
    }

    // Redirect to login page if sign-up-success page is accessed and user is not authenticated
    if (request.nextUrl.pathname === "/auth/sign-up-success" && !request.nextUrl.searchParams.get("mailConfirming")) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
    }

    // Redirect to admin/details/users page if admin/details is directly accessed and the user is admin
    if (request.nextUrl.pathname === "/admin/details" && effectiveUser) {
        if (effectiveUser.isAdmin) {
            const url = request.nextUrl.clone()
            url.pathname = "/admin/details/users"
            return NextResponse.redirect(url)
        }
    }

    // Check admin access for admin paths
    // If the user is authenticated or refresh token is available but not admin, redirect to home page
    if (isAdminPath && effectiveUser) {
        if (!effectiveUser.isAdmin) {
            const url = request.nextUrl.clone()
            url.pathname = "/"
            return NextResponse.redirect(url)
        }
    }

    // Protect API routes
    if (request.nextUrl.pathname.startsWith("/api")) {
        const publicApiPaths = ["/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/auth/refresh", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/account-confirm"]
        const adminApiPaths = ["/api/users"]
        const isPublicApi = publicApiPaths.some((path) => request.nextUrl.pathname.startsWith(path))
        const isAdminApi = adminApiPaths.some((path) => request.nextUrl.pathname.startsWith(path))

        if (isPublicApi) {
            return NextResponse.next()
        }

        // If the access token is expired or not included in the request, block the request to API routes
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        // If the user is not admin, block the request to admin API routes
        if (isAdminApi) {
            if (!user.isAdmin) {
                return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
            }
        }

        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}