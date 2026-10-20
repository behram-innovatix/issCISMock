import type { Metadata } from "next"
import { StaffProfileScreen } from "@/platforms/hr/features/staff-profile/screen"

export const metadata: Metadata = { title: "Staff profile" }

export default async function Page({ params }: PageProps<"/hr/staff/[id]">) {
    const { id } = await params
    return <StaffProfileScreen id={decodeURIComponent(id)} />
}
