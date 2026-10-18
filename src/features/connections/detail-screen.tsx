"use client"

import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Empty, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { fmt } from "@/lib/format"
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Clock,
    Database,
    PlugZap,
    RefreshCw,
    RotateCcw,
    Trash2,
    X,
    XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"
import {
    ApiError,
    useCatalog,
    useDataSource,
    useDeleteDataSource,
    useRuns,
    useSyncDataSource,
    useTestDataSource,
    type DataSource,
    type SyncMode,
    type SyncRun,
    type TestResult,
} from "./api"
import { ago, ApiProblem, dateTime, duration, NotFound, platformLabel, RUN_STATUS, scheduleLabel, SOURCE_STATUS } from "./shared"
import { SourceForm } from "./source-form"
import { FilesPanel, IngestPanel } from "./source-panels"
import { StreamsPanel } from "./source-streams"
import { TablesPanel } from "./source-tables"

type Tab = "history" | "tables" | "streams" | "files" | "ingest" | "settings"

export function DataSourceScreen({ id, autoTest }: { id: number; autoTest: boolean }) {
    const { data: source, error } = useDataSource(id)
    const { data: catalog } = useCatalog()
    const [chosenTab, setTab] = useState<Tab | null>(autoTest ? "settings" : null)
    const [syncedAt, setSyncedAt] = useState<number | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const waiting = syncedAt !== null && now - syncedAt < 45_000
    const { data: runs } = useRuns(id, waiting)
    const test = useTestDataSource(id)
    const sync = useSyncDataSource(id)
    const tested = useRef(false)

    useEffect(() => {
        if (autoTest && source && !tested.current) {
            tested.current = true
            test.mutate()
        }
    }, [autoTest, source, test])

    useEffect(() => {
        if (syncedAt === null) return
        const t = setInterval(() => setNow(Date.now()), 2_500)
        return () => clearInterval(t)
    }, [syncedAt])

    if (error) {
        return error instanceof ApiError && error.status === 404 ? (
            <>
                <PageHeader eyebrow="Connections" title="Data source not found" />
                <NotFound>This data source doesn’t exist, or it was deleted.</NotFound>
            </>
        ) : (
            <>
                <PageHeader eyebrow="Connections" title="Data source" />
                <ApiProblem error={error} />
            </>
        )
    }
    if (!source || !catalog) return <ScreenSkeleton />

    const connector = catalog.connectors.find((c) => c.type === source.type)
    const features = source.connector.features
    // open where the source needs attention: its settings, then (database sources) tables and streams
    const tab: Tab =
        chosenTab ??
        (!source.settings_complete
            ? "settings"
            : source.tables && source.tables.copied === 0
              ? "tables"
              : source.tables && source.tables.streams === 0
                ? "streams"
                : features.includes("uploads")
                  ? "files"
                  : "history")
    const running = runs?.[0]?.status === "running"
    // queued but no worker has started it yet: the newest run is older than the request
    const queuedOnly = syncedAt !== null && !running && (!runs?.[0] || new Date(runs[0].started_at).getTime() < syncedAt - 5_000)
    const lastGood = runs?.find((r) => r.status === "succeeded")
    const records = lastGood ? Object.values(lastGood.stats).reduce((s, x) => s + (x.mart ?? 0), 0) : null

    const startSync = (mode: SyncMode) =>
        sync.mutate(mode, {
            onSuccess: () => {
                setSyncedAt(Date.now())
                setNow(Date.now())
                setTab("history")
            },
        })

    return (
        <>
            <PageHeader
                eyebrow={`Connections · ${source.connector.label}`}
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        {source.name}
                        <Pill tone={SOURCE_STATUS[source.status].tone} dot className="text-[12px]">
                            {SOURCE_STATUS[source.status].label}
                        </Pill>
                    </span>
                }
                description={`${platformLabel(source.platform)} · tenant ${source.tenant} · ${scheduleLabel(source.schedule)}${source.is_active ? "" : " · paused"}`}
                actions={
                    <>
                        <Button onClick={() => test.mutate()} disabled={test.isPending}>
                            <PlugZap className="size-4" /> {test.isPending ? "Testing…" : "Test connection"}
                        </Button>
                        <Button
                            onClick={() => startSync("full")}
                            disabled={sync.isPending || running || source.needs_setup}
                            title="Re-read everything and drop records the source no longer has"
                        >
                            <RotateCcw className="size-4" /> Full sync
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => startSync("incremental")}
                            disabled={sync.isPending || running || source.needs_setup}
                        >
                            <RefreshCw className={cn("size-4", running && "animate-spin")} /> {running ? "Syncing…" : "Sync now"}
                        </Button>
                    </>
                }
            />

            <div className="space-y-4">
                {(test.data || test.error) && <TestBanner result={test.data} error={test.error} onClose={() => test.reset()} />}
                {sync.error && <Banner tone="bad" title="Couldn’t queue the sync" message={sync.error.message} />}
                {queuedOnly && (
                    <Banner
                        tone="info"
                        title="Sync queued"
                        message="It starts as soon as a CIS queue worker picks it up (php artisan queue:work in issCisApi)."
                    />
                )}
                {source.needs_setup && (
                    <Banner
                        tone="warn"
                        title="This connection needs setup"
                        message={`Its settings are incomplete, so it isn’t synced${source.is_active ? "" : " and is paused"}. Fill in the Settings below, then set it to Active.`}
                    />
                )}
                {!test.data && source.last_error && (source.status === "failing" || source.status === "degraded") && (
                    <Banner
                        tone={source.status === "failing" ? "bad" : "warn"}
                        title={source.status === "failing" ? "The last sync failed" : "The last sync was blocked by data checks"}
                        message={source.last_error}
                    />
                )}

                <KpiGrid>
                    <Kpi
                        label="Status"
                        value={running ? "Syncing" : SOURCE_STATUS[source.status].label}
                        icon={<Activity />}
                        color={`var(--${{ new: "muted", healthy: "good", degraded: "warn", failing: "bad" }[source.status]})`}
                        foot={source.is_active ? scheduleLabel(source.schedule) : "Paused"}
                    />
                    <Kpi
                        label="Last synced"
                        value={ago(source.last_synced_at)}
                        icon={<Clock />}
                        color="var(--c2)"
                        foot={source.last_synced_at ? dateTime(source.last_synced_at) : "No successful sync yet"}
                    />
                    <Kpi
                        label="Records in CIS"
                        value={records === null ? "—" : fmt(records)}
                        icon={<Database />}
                        color="var(--c3)"
                        foot={lastGood ? `${Object.keys(lastGood.stats).length} streams` : "After the first sync"}
                    />
                    <Kpi
                        label="Last run"
                        value={runs?.[0] ? RUN_STATUS[runs[0].status].label : "—"}
                        icon={<RefreshCw />}
                        color="var(--c4)"
                        foot={runs?.[0] ? `${runs[0].mode} · ${duration(runs[0].duration_seconds)}` : "Never run"}
                    />
                </KpiGrid>

                <Segmented
                    label="Section"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: "history" as Tab, label: "Sync history" },
                        ...(features.includes("tables")
                            ? [
                                  { value: "tables" as Tab, label: `Tables${source.tables ? ` · ${source.tables.copied}` : ""}` },
                                  {
                                      value: "streams" as Tab,
                                      label: `Dashboard streams${source.tables ? ` · ${source.tables.streams}` : ""}`,
                                  },
                              ]
                            : []),
                        ...(features.includes("uploads") ? [{ value: "files" as Tab, label: "Files" }] : []),
                        ...(features.includes("ingest") ? [{ value: "ingest" as Tab, label: "Push endpoint" }] : []),
                        { value: "settings" as Tab, label: "Settings" },
                    ]}
                />

                {tab === "history" ? (
                    <History runs={runs} />
                ) : tab === "tables" ? (
                    <TablesPanel source={source} />
                ) : tab === "streams" ? (
                    <StreamsPanel source={source} />
                ) : tab === "files" && catalog ? (
                    <FilesPanel source={source} streams={catalog.platforms.find((p) => p.code === source.platform)?.streams ?? []} />
                ) : tab === "ingest" ? (
                    <IngestPanel source={source} streams={catalog.platforms.find((p) => p.code === source.platform)?.streams ?? []} />
                ) : connector ? (
                    <>
                        <SourceForm key={source.id} connector={connector} catalog={catalog} source={source} onSaved={() => test.mutate()} />
                        <DangerZone source={source} />
                    </>
                ) : (
                    <NotFound>The “{source.type}” connector isn’t installed in the CIS API, so its settings can’t be edited.</NotFound>
                )}
            </div>
        </>
    )
}

function History({ runs }: { runs: SyncRun[] | undefined }) {
    const [open, setOpen] = useState<number | null>(null)

    return (
        <Panel title="Sync history" subtitle="The latest 20 runs. Select a run to see each stream." bodyClassName="-mx-5 -mb-5">
            {!runs ? (
                <div className="px-5 pb-5">
                    <Empty>Loading…</Empty>
                </div>
            ) : runs.length === 0 ? (
                <div className="px-5 pb-5">
                    <Empty>No syncs yet. Use “Sync now” to pull this source for the first time.</Empty>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-[12.5px]">
                        <thead>
                            <tr className="border-line text-muted border-y text-left text-[11px] font-semibold tracking-wide uppercase">
                                <th className="px-5 py-2.5">Started</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-3 py-2.5">Mode</th>
                                <th className="px-3 py-2.5 text-right">Records read</th>
                                <th className="px-3 py-2.5 text-right">Removed</th>
                                <th className="px-3 py-2.5 text-right">Duration</th>
                                <th className="w-10 px-5 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r) => {
                                const streams = Object.entries(r.stats)
                                const expanded = open === r.id
                                return (
                                    <Fragment key={r.id}>
                                        <tr
                                            onClick={() => setOpen(expanded ? null : r.id)}
                                            className="border-line hover:bg-bg/60 cursor-pointer border-b transition-colors"
                                            aria-expanded={expanded}
                                        >
                                            <td className="text-ink tabular px-5 py-3 font-semibold">{dateTime(r.started_at)}</td>
                                            <td className="px-3 py-3">
                                                <Pill tone={RUN_STATUS[r.status].tone} dot>
                                                    {RUN_STATUS[r.status].label}
                                                </Pill>
                                            </td>
                                            <td className="text-ink-2 px-3 py-3 capitalize">{r.mode}</td>
                                            <td className="text-ink tabular px-3 py-3 text-right">
                                                {fmt(streams.reduce((s, [, x]) => s + x.read, 0))}
                                            </td>
                                            <td className="text-ink-2 tabular px-3 py-3 text-right">
                                                {fmt(streams.reduce((s, [, x]) => s + x.deleted, 0))}
                                            </td>
                                            <td className="text-ink-2 tabular px-3 py-3 text-right">
                                                {r.status === "running" ? "…" : duration(r.duration_seconds)}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <ChevronDown
                                                    className={cn(
                                                        "text-muted inline size-4 transition-transform",
                                                        expanded && "rotate-180",
                                                    )}
                                                />
                                            </td>
                                        </tr>
                                        {expanded && (
                                            <tr className="border-line bg-surface-2 border-b">
                                                <td colSpan={7} className="px-5 py-4">
                                                    {r.error && (
                                                        <p className="bg-bad-soft text-bad-ink mb-3 rounded-xl px-3 py-2 text-[12px] font-semibold whitespace-pre-line">
                                                            {r.error}
                                                        </p>
                                                    )}
                                                    {r.replication && Object.keys(r.replication).length > 0 && (
                                                        <div className="mb-3">
                                                            <div className="eyebrow mb-1.5">Copied tables</div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {Object.entries(r.replication).map(([table, t]) => (
                                                                    <span
                                                                        key={table}
                                                                        title={t.warning}
                                                                        className={cn(
                                                                            "border-line bg-surface rounded-lg border px-2 py-1 font-mono text-[11px]",
                                                                            t.warning && "border-warn/40 text-warn-ink",
                                                                        )}
                                                                    >
                                                                        <span className="text-ink font-semibold">{table}</span>
                                                                        <span className="text-muted">
                                                                            {" "}
                                                                            {fmt(t.read)} read
                                                                            {t.deleted ? ` · ${fmt(t.deleted)} removed` : ""} ·{" "}
                                                                            {fmt(t.rows)} rows
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="eyebrow mb-1.5">Dashboard streams</div>
                                                    {streams.length === 0 ? (
                                                        <p className="text-muted text-[12px]">No streams were read.</p>
                                                    ) : (
                                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                            {streams.map(([name, s]) => (
                                                                <div
                                                                    key={name}
                                                                    className="border-line bg-surface rounded-xl border px-3 py-2.5"
                                                                >
                                                                    <div className="text-ink text-[12.5px] font-semibold">
                                                                        {name.replaceAll("_", " ")}
                                                                    </div>
                                                                    <div className="text-muted tabular mt-0.5 text-[11.5px]">
                                                                        {fmt(s.read)} read · {fmt(s.active)} active
                                                                        {s.deleted ? ` · ${fmt(s.deleted)} removed` : ""}
                                                                        {s.mart !== undefined ? ` · ${fmt(s.mart)} in dashboards` : ""}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    )
}

function TestBanner({ result, error, onClose }: { result?: TestResult; error: Error | null; onClose: () => void }) {
    if (error || !result)
        return <Banner tone="bad" title="Connection test failed" message={error?.message ?? "Unknown error"} onClose={onClose} />
    return (
        <Banner
            tone={result.ok ? "good" : "bad"}
            title={result.ok ? "Connection works" : "Connection test failed"}
            message={
                result.ok
                    ? `${result.message}. Streams available: ${result.streams.map((s) => s.replaceAll("_", " ")).join(", ") || "none"}.`
                    : result.message
            }
            onClose={onClose}
        />
    )
}

function Banner({
    tone,
    title,
    message,
    onClose,
}: {
    tone: "good" | "bad" | "warn" | "info"
    title: string
    message: string
    onClose?: () => void
}) {
    const Icon = { good: CheckCircle2, bad: XCircle, warn: AlertTriangle, info: Clock }[tone]
    return (
        <div
            role="status"
            className={cn(
                "animate-rise flex items-start gap-3 rounded-2xl border px-4 py-3",
                tone === "good" && "border-good/20 bg-good-soft text-good-ink",
                tone === "bad" && "border-bad/20 bg-bad-soft text-bad-ink",
                tone === "warn" && "border-warn/20 bg-warn-soft text-warn-ink",
                tone === "info" && "border-primary/15 bg-primary-soft text-primary",
            )}
        >
            <Icon className="mt-0.5 size-[18px] shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{title}</div>
                <p className="mt-0.5 text-[12.5px] break-words whitespace-pre-line opacity-90">{message}</p>
            </div>
            {onClose && (
                <button type="button" onClick={onClose} className="rounded-lg p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
                    <X className="size-4" />
                </button>
            )}
        </div>
    )
}

function DangerZone({ source }: { source: DataSource }) {
    const [confirming, setConfirming] = useState(false)
    const remove = useDeleteDataSource(source.id)
    const router = useRouter()

    return (
        <Panel title="Delete data source" subtitle="Removes the connection, everything it loaded into the CIS and its sync history.">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-ink-2 max-w-2xl text-[12.5px]">
                    Dashboards stop showing this source’s data straight away. To stop syncing but keep the data, set the status to Paused
                    instead.
                </p>
                <Button onClick={() => setConfirming(true)} className="text-bad-ink hover:border-bad/30 hover:text-bad-ink">
                    <Trash2 className="size-4" /> Delete…
                </Button>
            </div>
            {confirming && (
                <div
                    className="animate-fade bg-ink/25 fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-[2px]"
                    onClick={() => setConfirming(false)}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-title"
                        onClick={(e) => e.stopPropagation()}
                        className="animate-rise border-line bg-surface shadow-pop w-full max-w-[440px] rounded-2xl border p-6"
                    >
                        <h2 id="delete-title" className="font-display text-ink text-[18px] font-semibold">
                            Delete “{source.name}”?
                        </h2>
                        <p className="text-ink-2 mt-2 text-[13px]">
                            This permanently removes the connection, its records in the CIS and its sync history. It can’t be undone.
                        </p>
                        {remove.error && (
                            <p className="bg-bad-soft text-bad-ink mt-3 rounded-xl px-3 py-2 text-[12px] font-semibold">
                                {remove.error.message}
                            </p>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <Button onClick={() => setConfirming(false)}>Cancel</Button>
                            <Button
                                variant="danger"
                                disabled={remove.isPending}
                                onClick={() => remove.mutate(undefined, { onSuccess: () => router.push("/admin/connections") })}
                            >
                                <Trash2 className="size-4" /> {remove.isPending ? "Deleting…" : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Panel>
    )
}
