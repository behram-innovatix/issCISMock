import type { Metadata } from "next"
import { EduOverviewScreen } from "@/platforms/edu/features/overview/screen"

export const metadata: Metadata = { title: "EDU Overview" }

export default function Page() {
    return <EduOverviewScreen />
}
