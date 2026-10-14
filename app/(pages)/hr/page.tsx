import type { Metadata } from "next"
import { HrOverviewScreen } from "@/platforms/hr/features/overview/screen"

export const metadata: Metadata = { title: "HR Overview" }

export default function Page() {
    return <HrOverviewScreen />
}
