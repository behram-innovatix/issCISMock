import type { Metadata } from "next"
import { AccountProfileScreen } from "@/platforms/fin/features/account-profile/screen"

export const metadata: Metadata = { title: "Fee account" }

export default async function Page({ params }: PageProps<"/fin/accounts/[id]">) {
    const { id } = await params
    return <AccountProfileScreen id={decodeURIComponent(id)} />
}
