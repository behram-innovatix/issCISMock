"use client"

import { AS_OF, DATA_SOURCE } from "@/lib/data-source"
import { platformForPath } from "@/platforms/registry"
import { ChevronRight, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useShell } from "./ui-store"

export function Topbar() {
    const path = usePathname()
    const setMobileOpen = useShell((s) => s.setMobileOpen)
    const platform = platformForPath(path)
    const page =
        platform?.nav.find((n) => n.href === path) ??
        platform?.nav.filter((n) => n.href !== platform.basePath).find((n) => path.startsWith(n.href + "/"))
    const detail = page && path !== page.href

    const crumbs: { label: string; href?: string }[] = [{ label: "CIS", href: "/" }]
    if (path.startsWith("/admin")) crumbs.push({ label: "Administration" }, { label: "Users & Roles" })
    else if (!platform) crumbs.push({ label: "Executive Overview" })
    else {
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
                {DATA_SOURCE === "mock" && (
                    <span className="border-line-strong text-muted hidden rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold sm:inline">
                        Mock data
                    </span>
                )}
                <span className="border-line bg-surface text-ink-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11.5px] font-semibold shadow-xs">
                    <i className="relative flex size-2">
                        <i className="bg-good absolute inset-0 animate-ping rounded-full opacity-40" />
                        <i className="bg-good relative size-2 rounded-full" />
                    </i>
                    <span className="hidden sm:inline">As of</span>{" "}
                    {AS_OF.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
            </div>
        </header>
    )
}
