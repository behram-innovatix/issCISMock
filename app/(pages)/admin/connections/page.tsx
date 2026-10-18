import type { Metadata } from "next"
import { requireRole } from "@/auth/session"
import { ConnectionsScreen } from "@/features/connections/list-screen"

export const metadata: Metadata = { title: "Connections" }

export default async function Page() {
    await requireRole("admin")
    return <ConnectionsScreen />
}
