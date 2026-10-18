import type { Metadata } from "next"
import { FinFeesScreen } from "@/platforms/fin/features/fees/screen"

export const metadata: Metadata = { title: "Fees & Collections" }

export default function Page() {
    return <FinFeesScreen />
}
