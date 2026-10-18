import type { Metadata } from "next"
import { FinCashFlowScreen } from "@/platforms/fin/features/cash-flow/screen"

export const metadata: Metadata = { title: "Revenue & Cash Flow" }

export default function Page() {
    return <FinCashFlowScreen />
}
