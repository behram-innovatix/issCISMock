import type { Metadata } from "next"
import { ExecutiveOverviewScreen } from "@/features/executive/screen"

export const metadata: Metadata = { title: "Executive Overview" }

export default function Page() {
    return <ExecutiveOverviewScreen />
}
