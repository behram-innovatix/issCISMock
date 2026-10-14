import { requireSession } from "@/auth/session"
import { AppShell } from "@/components/shell/app-shell"
import type { ReactNode } from "react"

export default async function PagesLayout({ children }: { children: ReactNode }) {
    const user = await requireSession()
    return <AppShell user={user}>{children}</AppShell>
}
