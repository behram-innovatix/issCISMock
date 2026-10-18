import type { Metadata } from "next"
import { FinAccountsScreen } from "@/platforms/fin/features/accounts/screen"

export const metadata: Metadata = { title: "Fee Accounts" }

export default function Page() {
    return <FinAccountsScreen />
}
