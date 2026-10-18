import type { Metadata } from "next"
import { FinBudgetScreen } from "@/platforms/fin/features/budget/screen"

export const metadata: Metadata = { title: "Budget vs Actual" }

export default function Page() {
    return <FinBudgetScreen />
}
