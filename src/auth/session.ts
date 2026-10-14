import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import type { SessionUser, UserRole } from "./roles"
import { SESSION_COOKIE, verifySessionToken } from "./token"

/** Server-only session access (reads the signed httpOnly cookie). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
    const store = await cookies()
    return verifySessionToken(store.get(SESSION_COOKIE)?.value)
})

export async function requireSession(): Promise<SessionUser> {
    const user = await getSession()
    if (!user) redirect("/login")
    return user
}

export async function requireRole(role: UserRole): Promise<SessionUser> {
    const user = await requireSession()
    if (user.role !== role) redirect("/")
    return user
}
