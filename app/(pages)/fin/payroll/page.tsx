import type { Metadata } from "next"
import { FinPayrollScreen } from "@/platforms/fin/features/payroll/screen"

export const metadata: Metadata = { title: "Payroll" }

export default function Page() {
    return <FinPayrollScreen />
}
