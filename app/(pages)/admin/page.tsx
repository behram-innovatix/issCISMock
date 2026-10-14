import type { Metadata } from "next"
import { requireRole } from "@/auth/session"
import { AdminScreen } from "@/features/admin/screen"

export const metadata: Metadata = { title: "Users & Roles" }

export default async function Page() {
    const user = await requireRole("admin")
    return <AdminScreen currentUserId={user.id} />
}
