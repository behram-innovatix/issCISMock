import type { Metadata } from "next"
import { requireRole } from "@/auth/session"
import { NewConnectionScreen } from "@/features/connections/new-screen"

export const metadata: Metadata = { title: "Add connection" }

export default async function Page({ searchParams }: PageProps<"/admin/connections/new">) {
    await requireRole("admin")
    const { type } = await searchParams
    return <NewConnectionScreen type={typeof type === "string" ? type : null} />
}
