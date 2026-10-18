"use client"

import { logout } from "@/auth/actions"
import { ROLES, can, type SessionUser } from "@/auth/roles"
import { cn } from "@/lib/cn"
import { initials } from "@/lib/format"
import { platformForPath, platformsOf, SUITES, type PlatformDefinition, type SuiteDefinition } from "@/platforms/registry"
import { Cable, ChevronDown, Gauge, LogOut, PanelLeftClose, PanelLeft, ShieldCheck, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useShell } from "./ui-store"

export function BrandMark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[0_6px_16px_-8px_rgba(47,91,216,.8)]",
                className,
            )}
        >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 19V11M10 19V6M15 19v-5M20 19V9" />
            </svg>
        </span>
    )
}

export function Sidebar({ user }: { user: SessionUser }) {
    const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useShell()
    return (
        <>
            {/* mobile scrim */}
            <div
                onClick={() => setMobileOpen(false)}
                className={cn(
                    "bg-ink/20 fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
                    mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
            />
            <aside
                className={cn(
                    "border-line bg-surface/90 fixed inset-y-0 left-0 z-50 flex flex-col border-r backdrop-blur-xl transition-[width,transform] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
                    "w-[272px] lg:translate-x-0",
                    collapsed ? "lg:w-[76px]" : "lg:w-[264px]",
                    mobileOpen ? "shadow-pop translate-x-0" : "-translate-x-full",
                )}
                aria-label="Main navigation"
            >
                <div className={cn("flex h-16 items-center gap-3 px-5", collapsed && "lg:justify-center lg:px-0")}>
                    <BrandMark />
                    <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                        <div className="font-display text-ink text-[15px] leading-tight font-semibold">
                            ISS <span className="text-gradient">CIS</span>
                        </div>
                        <div className="text-muted truncate text-[11px]">Central Intelligence System</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="text-muted hover:bg-bg-2 rounded-lg p-1.5 lg:hidden"
                        aria-label="Close menu"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto px-3 pt-3 pb-6">
                    <NavSection title="Executive" collapsed={collapsed}>
                        <NavLink href="/" label="Executive Overview" icon={<Gauge />} exact collapsed={collapsed} />
                    </NavSection>
                    <NavSection title="Platforms" collapsed={collapsed}>
                        {SUITES.map((s) => (
                            <SuiteGroup key={s.code} suite={s} collapsed={collapsed} />
                        ))}
                    </NavSection>
                    {(can(user.role, "admin.users.manage") || can(user.role, "admin.connections.manage")) && (
                        <NavSection title="Administration" collapsed={collapsed}>
                            {can(user.role, "admin.users.manage") && (
                                <NavLink href="/admin" label="Users & Roles" icon={<ShieldCheck />} exact collapsed={collapsed} />
                            )}
                            {can(user.role, "admin.connections.manage") && (
                                <NavLink href="/admin/connections" label="Connections" icon={<Cable />} collapsed={collapsed} />
                            )}
                        </NavSection>
                    )}
                </nav>

                <div className={cn("border-line border-t p-3", collapsed && "lg:px-2")}>
                    <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2", collapsed && "lg:flex-col lg:gap-2 lg:px-0")}>
                        <span
                            className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                            title={collapsed ? `${user.name} · ${ROLES[user.role].label}` : undefined}
                        >
                            {initials(user.name)}
                        </span>
                        <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                            <div className="text-ink truncate text-[13px] font-semibold">{user.name}</div>
                            <div className="text-muted truncate text-[11px]">
                                {ROLES[user.role].label} · {user.title}
                            </div>
                        </div>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="text-muted hover:bg-bad-soft hover:text-bad-ink flex size-8 items-center justify-center rounded-lg transition-colors"
                                aria-label="Sign out"
                                title="Sign out"
                            >
                                <LogOut className="size-4" />
                            </button>
                        </form>
                    </div>
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        className={cn(
                            "text-muted hover:bg-bg-2 hover:text-ink mt-1 hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors lg:flex",
                            collapsed && "justify-center px-0",
                        )}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
                        {!collapsed && "Collapse"}
                    </button>
                </div>
            </aside>
        </>
    )
}

function NavSection({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
    return (
        <div>
            <div className={cn("eyebrow mb-2 px-3", collapsed && "lg:invisible")}>{title}</div>
            <div className="space-y-1">{children}</div>
        </div>
    )
}

function NavLink({
    href,
    label,
    icon,
    exact,
    collapsed,
    nested,
}: {
    href: string
    label: string
    icon: React.ReactNode
    exact?: boolean
    collapsed: boolean
    nested?: boolean
}) {
    const path = usePathname()
    const setMobileOpen = useShell((s) => s.setMobileOpen)
    const active = exact ? path === href : path === href || path.startsWith(href + "/")
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
                "group relative flex items-center gap-3 rounded-xl text-[13px] font-semibold transition-all duration-200",
                nested ? "py-2 pr-3 pl-11" : "px-3 py-2.5",
                collapsed && "lg:justify-center lg:px-0",
                active ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-bg-2 hover:text-ink",
            )}
        >
            {active && nested && <span className="bg-primary absolute top-1/2 left-[26px] h-4 w-[3px] -translate-y-1/2 rounded-full" />}
            <span className={cn("shrink-0 [&>svg]:size-[18px]", nested && "hidden", collapsed && "lg:inline")}>{icon}</span>
            <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
        </Link>
    )
}

function SuiteGroup({ suite, collapsed }: { suite: SuiteDefinition; collapsed: boolean }) {
    const path = usePathname()
    const platforms = platformsOf(suite).filter((p) => p.status === "live")
    const current = platformForPath(path)
    const active = !!current && suite.platforms.includes(current.code)
    const [open, setOpen] = useState(active)
    const [prevActive, setPrevActive] = useState(active)
    if (active !== prevActive) {
        setPrevActive(active)
        if (active) setOpen(true)
    }
    const Icon = suite.icon

    if (platforms.length === 0) {
        return (
            <div
                className={cn(
                    "text-muted flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold",
                    collapsed && "lg:justify-center lg:px-0",
                )}
                title={`${suite.name}: coming soon`}
            >
                <PlatformIcon icon={<Icon />} accent={suite.accent} muted />
                <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{suite.name}</span>
                <span
                    className={cn(
                        "bg-bg-2 text-muted rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                        collapsed && "lg:hidden",
                    )}
                >
                    Soon
                </span>
            </div>
        )
    }

    const expanded = <Expanded suite={suite} platforms={platforms} open={open} setOpen={setOpen} active={active} />

    if (collapsed) {
        return (
            <>
                <Link
                    href={(active && current ? current : platforms[0]).basePath}
                    title={suite.name}
                    className={cn(
                        "hidden items-center justify-center rounded-xl py-2.5 transition-colors lg:flex",
                        active ? "bg-primary-soft" : "hover:bg-bg-2",
                    )}
                >
                    <PlatformIcon icon={<Icon />} accent={suite.accent} />
                </Link>
                <div className="lg:hidden">{expanded}</div>
            </>
        )
    }
    return expanded
}

function Expanded({
    suite,
    platforms,
    open,
    setOpen,
    active,
}: {
    suite: SuiteDefinition
    platforms: PlatformDefinition[]
    open: boolean
    setOpen: (v: boolean) => void
    active: boolean
}) {
    const Icon = suite.icon
    const grouped = platforms.length > 1
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors duration-200",
                    active ? "text-ink" : "text-ink-2 hover:bg-bg-2 hover:text-ink",
                )}
            >
                <PlatformIcon icon={<Icon />} accent={suite.accent} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate">{suite.name}</span>
                    {grouped && <span className="text-muted block truncate text-[11px] font-medium">{suite.description}</span>}
                </span>
                <ChevronDown className={cn("text-muted size-4 transition-transform duration-300", open && "rotate-180")} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                    <div className="before:bg-line-strong relative mt-1 space-y-0.5 pb-1 before:absolute before:top-1 before:bottom-2 before:left-[27px] before:w-px">
                        {platforms.map((p) => (
                            <div key={p.code} className={cn(grouped && "pt-1.5 first:pt-0")}>
                                {grouped && (
                                    <div className="text-muted flex items-center gap-1.5 py-1.5 pr-3 pl-11 text-[10.5px] font-bold tracking-[.08em] uppercase">
                                        <p.icon className="size-3.5" style={{ color: p.accent }} />
                                        {p.name}
                                    </div>
                                )}
                                {p.nav.map((n) => (
                                    <NavLink
                                        key={n.href}
                                        href={n.href}
                                        label={n.label}
                                        icon={<n.icon />}
                                        exact={n.href === p.basePath}
                                        collapsed={false}
                                        nested
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function PlatformIcon({ icon, accent, muted }: { icon: React.ReactNode; accent: string; muted?: boolean }) {
    return (
        <span
            className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4", muted && "opacity-60")}
            style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
        >
            {icon}
        </span>
    )
}
