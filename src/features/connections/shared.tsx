"use client"

import { Empty, Panel } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import type { PillTone } from "@/lib/status"
import { PLATFORMS, suiteOf } from "@/platforms/registry"
import { Database, FileJson, FileSpreadsheet, Globe, type LucideIcon, Plug, Server, Unplug, Webhook } from "lucide-react"
import { ApiError, type RunStatus, type SourceStatus } from "./api"

const ICONS: Record<string, LucideIcon> = {
    server: Server,
    file: FileJson,
    database: Database,
    sheet: FileSpreadsheet,
    globe: Globe,
    webhook: Webhook,
}

/** Tile for a connector type; the API names icons generically and each UI maps them to its own set. */
export function ConnectorIcon({ icon, size = "md", muted }: { icon: string; size?: "sm" | "md" | "lg"; muted?: boolean }) {
    const Icon = ICONS[icon] ?? Plug
    return (
        <span
            className={cn(
                "flex shrink-0 items-center justify-center rounded-xl",
                size === "sm" && "size-8 [&>svg]:size-4",
                size === "md" && "size-10 [&>svg]:size-[18px]",
                size === "lg" && "size-12 [&>svg]:size-[22px]",
                muted ? "bg-bg-2 text-muted" : "bg-primary-soft text-primary",
            )}
        >
            <Icon />
        </span>
    )
}

export const SOURCE_STATUS: Record<SourceStatus, { label: string; tone: PillTone }> = {
    new: { label: "Not synced yet", tone: "neutral" },
    healthy: { label: "Healthy", tone: "good" },
    degraded: { label: "Needs review", tone: "warn" },
    failing: { label: "Failing", tone: "bad" },
}

export const RUN_STATUS: Record<RunStatus, { label: string; tone: PillTone }> = {
    running: { label: "Running", tone: "info" },
    succeeded: { label: "Succeeded", tone: "good" },
    degraded: { label: "Blocked by checks", tone: "warn" },
    failed: { label: "Failed", tone: "bad" },
}

/** "ERP · HR" for platforms inside a multi-platform suite, otherwise the platform name. */
export function platformLabel(code: string) {
    const platform = PLATFORMS.find((p) => p.code === code)
    if (!platform) return code.toUpperCase()
    const suite = suiteOf(platform)
    return suite && suite.platforms.length > 1 ? `${suite.name} · ${platform.name}` : platform.name
}

export const SCHEDULES = [
    { value: "*/15 * * * *", label: "Every 15 min" },
    { value: "0 * * * *", label: "Hourly" },
    { value: "0 */6 * * *", label: "Every 6 hours" },
    { value: "0 2 * * *", label: "Nightly" },
]

export const scheduleLabel = (cron: string) => SCHEDULES.find((s) => s.value === cron)?.label ?? `Cron ${cron}`

const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })

export function ago(iso: string | null) {
    if (!iso) return "Never"
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000
    const [value, unit] =
        Math.abs(seconds) < 60
            ? [seconds, "second"]
            : Math.abs(seconds) < 3600
              ? [seconds / 60, "minute"]
              : Math.abs(seconds) < 86400
                ? [seconds / 3600, "hour"]
                : [seconds / 86400, "day"]
    return rtf.format(Math.round(value), unit as Intl.RelativeTimeFormatUnit)
}

export const dateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function duration(seconds: number | null) {
    if (seconds === null) return "—"
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** Shown when the CIS API can't be used (not configured, unreachable, or the token was rejected). */
export function ApiProblem({ error }: { error: unknown }) {
    const message = error instanceof ApiError ? error.message : "Something went wrong while loading connections."
    return (
        <Panel>
            <div className="flex items-start gap-3.5">
                <span className="bg-bad-soft text-bad-ink flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Unplug className="size-5" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-ink text-[14.5px] font-semibold">The CIS API isn’t available</h3>
                    <p className="text-ink-2 mt-1 text-[13px]">{message}</p>
                    <p className="text-muted mt-2 text-[12px]">
                        Connections are managed by the CIS API (Herd/issCisApi). Check that it is running and that CIS_API_URL and
                        CIS_API_TOKEN are set.
                    </p>
                </div>
            </div>
        </Panel>
    )
}

export function NotFound({ children }: { children: React.ReactNode }) {
    return (
        <Panel>
            <Empty>{children}</Empty>
        </Panel>
    )
}
