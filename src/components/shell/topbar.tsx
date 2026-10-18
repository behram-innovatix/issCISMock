"use client"

import { AS_OF } from "@/lib/calendar"
import type { InsightsMeta } from "@/lib/insights"
import { platformForPath, suiteOf } from "@/platforms/registry"
import { skipToken, useQuery } from "@tanstack/react-query"
import { ChevronRight, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useShell } from "./ui-store"

export function Topbar() {
    const path = usePathname()
    const setMobileOpen = useShell((s) => s.setMobileOpen)
    const platform = platformForPath(path)
    // freshness of the dataset the page shows (the Executive Overview leads with EDU); read from the
    // query cache only, never fetched here
    const code = platform?.code ?? (path === "/" ? "edu" : null)
    const { data } = useQuery<{ meta: InsightsMeta }>({ queryKey: [code ?? "none", "dataset"], queryFn: skipToken })
    const meta = code ? data?.meta : undefined
    const page =
        platform?.nav.find((n) => n.href === path) ??
        platform?.nav.filter((n) => n.href !== platform.basePath).find((n) => path.startsWith(n.href + "/"))
    const detail = page && path !== page.href

    const crumbs: { label: string; href?: string }[] = [{ label: "CIS", href: "/" }]
    if (path.startsWith("/admin/connections")) {
        crumbs.push(
            { label: "Administration" },
            { label: "Connections", href: path === "/admin/connections" ? undefined : "/admin/connections" },
        )
        if (path === "/admin/connections/new") crumbs.push({ label: "Add connection" })
        else if (path !== "/admin/connections") crumbs.push({ label: "Data source" })
    } else if (path.startsWith("/admin")) crumbs.push({ label: "Administration" }, { label: "Users & Roles" })
    else if (!platform) crumbs.push({ label: "Executive Overview" })
    else {
        const suite = suiteOf(platform)
        if (suite && suite.platforms.length > 1) crumbs.push({ label: suite.name })
        crumbs.push({ label: platform.name, href: platform.basePath })
        if (page) crumbs.push({ label: page.label, href: detail ? page.href : undefined })
        if (detail) crumbs.push({ label: "Profile" })
    }

    return (
        <header className="border-line bg-bg/75 sticky top-0 z-30 border-b backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-3 px-4 md:px-8">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="text-ink-2 hover:bg-bg-2 -ml-1 rounded-lg p-2 lg:hidden"
                    aria-label="Open menu"
                >
                    <Menu className="size-5" />
                </button>
                <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
                    {crumbs.map((c, i) => (
                        <span key={i} className="flex min-w-0 items-center gap-1.5">
                            {i > 0 && <ChevronRight className="text-muted size-3.5 shrink-0" />}
                            {c.href && i < crumbs.length - 1 ? (
                                <Link href={c.href} className="text-muted hover:text-ink truncate font-medium transition-colors">
                                    {c.label}
                                </Link>
                            ) : (
                                <span className="text-ink truncate font-semibold">{c.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
                {meta && <Freshness meta={meta} />}
            </div>
        </header>
    )
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** How current the platform's data is, from its sources' last syncs. */
function Freshness({ meta }: { meta: InsightsMeta }) {
    const failing = meta.sources.some((s) => s.is_active && s.status === "failing")
    const degraded = meta.sources.some((s) => s.is_active && s.status === "degraded")
    const tone = !meta.connected ? "muted" : failing ? "bad" : degraded ? "warn" : "good"
    const synced = meta.synced_at ? new Date(meta.synced_at) : null
    const title = [
        meta.platform === "edu" && meta.connected ? `Attendance to ${fmtDate(AS_OF)}` : null,
        synced
            ? `Last synced ${synced.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "Never synced",
        failing ? "A source is failing" : degraded ? "A sync was blocked by data checks" : null,
    ]
        .filter(Boolean)
        .join(" · ")

    return (
        <span
            title={title}
            className="border-line bg-surface text-ink-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11.5px] font-semibold shadow-xs"
        >
            <i className="relative flex size-2">
                {tone === "good" && <i className="bg-good absolute inset-0 animate-ping rounded-full opacity-40" />}
                <i className="relative size-2 rounded-full" style={{ background: `var(--${tone})` }} />
            </i>
            {!meta.connected ? (
                "Not connected"
            ) : meta.platform === "edu" ? (
                <>
                    <span className="hidden sm:inline">As of</span> {fmtDate(AS_OF)}
                </>
            ) : (
                <>
                    <span className="hidden sm:inline">Synced</span> {synced ? fmtDate(synced) : "never"}
                </>
            )}
        </span>
    )
}
