"use client"

import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { PageHeader } from "@/components/shell/page-header"
import { Button, buttonClass } from "@/components/ui/button"
import { Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Skeleton } from "@/components/ui/skeleton"
import { PLATFORMS } from "@/platforms/registry"
import { Activity, AlertTriangle, Cable, ChevronRight, Clock, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useDataSources, useSyncDataSource, type DataSource } from "./api"
import { ago, ApiProblem, ConnectorIcon, platformLabel, scheduleLabel, SOURCE_STATUS } from "./shared"

export function ConnectionsScreen() {
    const { data: sources, error } = useDataSources()

    const attention = sources?.filter((s) => s.status === "degraded" || s.status === "failing").length ?? 0
    const latest =
        sources
            ?.map((s) => s.last_synced_at)
            .filter((d): d is string => !!d)
            .sort()
            .at(-1) ?? null
    const byPlatform = PLATFORMS.map((p) => ({ code: p.code, sources: sources?.filter((s) => s.platform === p.code) ?? [] }))
    const other = sources?.filter((s) => !PLATFORMS.some((p) => p.code === s.platform)) ?? []

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Connections"
                description="The data sources behind every dashboard. Each one is pulled into the CIS on its own schedule and checked before the dashboards update."
                actions={
                    <Link href="/admin/connections/new" className={buttonClass("primary")}>
                        <Plus className="size-4" /> Add connection
                    </Link>
                }
            />

            {error ? (
                <ApiProblem error={error} />
            ) : !sources ? (
                <div className="space-y-4" aria-busy="true" aria-label="Loading">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} className="h-[104px]" />
                        ))}
                    </div>
                    <Skeleton className="h-64" />
                </div>
            ) : (
                <div className="space-y-4">
                    <KpiGrid>
                        <Kpi
                            label="Data sources"
                            value={sources.length}
                            icon={<Cable />}
                            foot={`${sources.filter((s) => s.is_active).length} active`}
                        />
                        <Kpi
                            label="Healthy"
                            value={sources.filter((s) => s.status === "healthy").length}
                            icon={<Activity />}
                            color="var(--good)"
                            foot="Last sync succeeded"
                        />
                        <Kpi
                            label="Need attention"
                            value={attention}
                            icon={<AlertTriangle />}
                            color={attention ? "var(--bad)" : "var(--muted)"}
                            foot="Failing or blocked by checks"
                        />
                        <Kpi label="Latest sync" value={ago(latest)} icon={<Clock />} color="var(--c2)" foot="Across all sources" />
                    </KpiGrid>

                    {sources.length === 0 ? (
                        <Panel>
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <span className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-2xl">
                                    <Cable className="size-6" />
                                </span>
                                <div>
                                    <h3 className="text-ink text-[15px] font-semibold">No connections yet</h3>
                                    <p className="text-muted mt-1 text-[12.5px]">Add a data source to start feeding EDU and ERP.</p>
                                </div>
                                <Link href="/admin/connections/new" className={buttonClass("primary")}>
                                    <Plus className="size-4" /> Add connection
                                </Link>
                            </div>
                        </Panel>
                    ) : (
                        <>
                            {byPlatform
                                .filter((g) => g.sources.length > 0)
                                .map((g) => (
                                    <SourceGroup key={g.code} title={platformLabel(g.code)} sources={g.sources} />
                                ))}
                            {other.length > 0 && <SourceGroup title="Other" sources={other} />}
                        </>
                    )}
                </div>
            )}
        </>
    )
}

function SourceGroup({ title, sources }: { title: string; sources: DataSource[] }) {
    return (
        <Panel
            title={title}
            subtitle={`${sources.length} ${sources.length === 1 ? "data source" : "data sources"}`}
            bodyClassName="-mx-5 -mb-5"
        >
            <ul className="border-line border-t">
                {sources.map((s) => (
                    <SourceRow key={s.id} source={s} />
                ))}
            </ul>
        </Panel>
    )
}

function SourceRow({ source: s }: { source: DataSource }) {
    const sync = useSyncDataSource(s.id)
    const status = SOURCE_STATUS[s.status]
    const running = s.latest_run?.status === "running"

    return (
        <li className="border-line hover:bg-bg/60 group flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3.5 transition-colors last:border-b-0">
            <Link href={`/admin/connections/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                <ConnectorIcon icon={s.connector.icon} muted={!s.is_active} />
                <div className="min-w-0">
                    <div className="text-ink flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
                        <span className="truncate">{s.name}</span>
                        {s.needs_setup ? <Pill tone="warn">Needs setup</Pill> : !s.is_active && <Pill>Paused</Pill>}
                    </div>
                    <div className="text-muted truncate text-[11.5px]">
                        {s.connector.label} · tenant {s.tenant} · {scheduleLabel(s.schedule)}
                    </div>
                </div>
            </Link>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    {running ? (
                        <Pill tone="info" dot>
                            Syncing…
                        </Pill>
                    ) : (
                        <Pill tone={status.tone} dot>
                            {status.label}
                        </Pill>
                    )}
                    <div className="text-muted tabular mt-1 text-[11px]">Synced {ago(s.last_synced_at).toLowerCase()}</div>
                </div>
                <Button
                    size="sm"
                    onClick={() => sync.mutate("incremental")}
                    disabled={sync.isPending || running || s.needs_setup}
                    title="Pull changes now"
                    aria-label={`Sync ${s.name} now`}
                >
                    <RefreshCw className={sync.isPending || running ? "size-3.5 animate-spin" : "size-3.5"} />
                    {sync.isSuccess && !running ? "Queued" : "Sync"}
                </Button>
                <Link href={`/admin/connections/${s.id}`} className="text-muted hover:text-ink" aria-label={`Open ${s.name}`}>
                    <ChevronRight className="size-4" />
                </Link>
            </div>
        </li>
    )
}
