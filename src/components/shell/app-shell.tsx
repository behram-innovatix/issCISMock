"use client"

import type { SessionUser } from "@/auth/roles"
import { cn } from "@/lib/cn"
import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { useShell } from "./ui-store"

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
    const collapsed = useShell((s) => s.collapsed)
    return (
        <div className="min-h-dvh">
            <Sidebar user={user} />
            <div
                className={cn(
                    "transition-[padding] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
                    collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]",
                )}
            >
                <Topbar />
                <main className="mx-auto max-w-[1480px] px-4 pt-6 pb-16 md:px-8">{children}</main>
            </div>
        </div>
    )
}
