import type { Metadata } from "next"
import { FinOverviewScreen } from "@/platforms/fin/features/overview/screen"

export const metadata: Metadata = { title: "Finance Overview" }

export default function Page() {
    return <FinOverviewScreen />
}
