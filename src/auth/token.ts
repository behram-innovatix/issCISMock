import { createHmac, timingSafeEqual } from "node:crypto"
import { isUserRole, type SessionUser } from "./roles"

/** Signed, stateless session token: base64url(JSON payload) + "." + HMAC-SHA256. Shared by proxy.ts and the server. */
export const SESSION_COOKIE = "cis_session"
export const SESSION_TTL_SECONDS = 8 * 60 * 60

interface Payload extends SessionUser {
    exp: number
}

const secret = () => process.env.SESSION_SECRET || "dev-only-cis-session-secret-change-me"

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url")

export function createSessionToken(user: SessionUser): string {
    const payload: Payload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
    return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
    if (!token) return null
    const [body, sig] = token.split(".")
    if (!body || !sig) return null
    const expected = Buffer.from(sign(body))
    const given = Buffer.from(sig)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    try {
        const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload
        if (typeof p.exp !== "number" || p.exp * 1000 < Date.now() || !isUserRole(p.role)) return null
        return { id: p.id, name: p.name, email: p.email, title: p.title, role: p.role }
    } catch {
        return null
    }
}
