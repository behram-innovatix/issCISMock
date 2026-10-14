import type { Metadata } from "next"
import { LoginScreen } from "@/features/auth/login-screen"

export const metadata: Metadata = { title: "Sign in" }

export default async function Page({ searchParams }: PageProps<"/login">) {
    const { next } = await searchParams
    return <LoginScreen next={typeof next === "string" ? next : undefined} />
}
