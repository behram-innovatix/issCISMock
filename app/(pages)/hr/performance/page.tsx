import type { Metadata } from "next"
import { HrPerformanceScreen } from "@/platforms/hr/features/performance/screen"

export const metadata: Metadata = { title: "Performance & Appraisals" }

export default function Page() {
    return <HrPerformanceScreen />
}
