import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireRole } from "@/auth/session"
import { DataSourceScreen } from "@/features/connections/detail-screen"

export const metadata: Metadata = { title: "Data source" }

export default async function Page({ params, searchParams }: PageProps<"/admin/connections/[id]">) {
    await requireRole("admin")
    const id = Number((await params).id)
    if (!Number.isInteger(id) || id <= 0) notFound()
    return <DataSourceScreen id={id} autoTest={(await searchParams).test === "1"} />
}
