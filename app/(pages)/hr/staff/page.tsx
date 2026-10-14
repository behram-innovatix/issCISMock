import type { Metadata } from "next"
import { HrStaffScreen } from "@/platforms/hr/features/staff/screen"

export const metadata: Metadata = { title: "Staff" }

export default function Page() {
    return <HrStaffScreen />
}
