"use server"

import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "./token"
import { DEMO_PASSWORD, USERS } from "./users"

export interface LoginState {
    error?: string
    email?: string
}

const sameBytes = (a: string, b: string) => {
    const x = Buffer.from(a)
    const y = Buffer.from(b)
    return x.length === y.length && timingSafeEqual(x, y)
}

/** Only allow same-origin relative redirects after sign-in. */
const safeNext = (v: FormDataEntryValue | null) =>
    typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") && !v.startsWith("/login") ? v : "/"

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase()
    const password = String(formData.get("password") ?? "")
    if (!email || !password) return { error: "Enter your email and password.", email }

    // Mock credential check — replace with the ISSPHERE identity API when available.
    const user = USERS.find((u) => u.email === email)
    const ok = sameBytes(password, DEMO_PASSWORD)
    if (!user || !ok) return { error: "Incorrect email or password.", email }
    if (user.status !== "active") return { error: "This account is not active. Contact your administrator.", email }

    const store = await cookies()
    store.set(SESSION_COOKIE, createSessionToken({ id: user.id, name: user.name, email: user.email, title: user.title, role: user.role }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    })
    redirect(safeNext(formData.get("next")))
}

export async function logout() {
    const store = await cookies()
    store.delete(SESSION_COOKIE)
    redirect("/login")
}
