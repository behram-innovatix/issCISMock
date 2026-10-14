import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/auth/token"

/** Optimistic route gate: signed-out users go to /login, non-admins are kept out of /admin. */
export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl
    const user = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
    const isLogin = pathname === "/login"

    if (!user) {
        if (isLogin) return NextResponse.next()
        const url = new URL("/login", request.url)
        if (pathname !== "/") url.searchParams.set("next", pathname + search)
        return NextResponse.redirect(url)
    }
    if (isLogin) return NextResponse.redirect(new URL("/", request.url))
    if ((pathname === "/admin" || pathname.startsWith("/admin/")) && user.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt)$).*)"],
}
