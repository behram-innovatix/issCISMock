"use client"

import { SearchInput } from "@/components/insights/search-input"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Empty, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useCatalog, type Connector, type PlannedConnector } from "./api"
import { ApiProblem, ConnectorIcon, platformLabel } from "./shared"
import { SourceForm } from "./source-form"

/** Step 1: pick a connector type from the catalog. Step 2 (?type=…): fill in its settings. */
export function NewConnectionScreen({ type }: { type: string | null }) {
    const { data: catalog, error } = useCatalog()
    const router = useRouter()
    const connector = catalog?.connectors.find((c) => c.type === type)

    if (error) {
        return (
            <>
                <PageHeader eyebrow="Connections" title="Add connection" />
                <ApiProblem error={error} />
            </>
        )
    }

    if (!catalog) {
        return (
            <>
                <PageHeader eyebrow="Connections" title="Add connection" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </>
        )
    }

    if (connector) {
        return (
            <>
                <PageHeader
                    eyebrow="Connections · Add connection"
                    title={connector.label}
                    description="Name the source, choose the platform it feeds, then enter its connection settings. Saving runs a connection test."
                    actions={
                        <Button onClick={() => router.push("/admin/connections/new")}>
                            <ArrowLeft className="size-4" /> Choose another type
                        </Button>
                    }
                />
                <SourceForm
                    connector={connector}
                    catalog={catalog}
                    onCancel={() => router.push("/admin/connections")}
                    onSaved={(source) => router.push(`/admin/connections/${source.id}?test=1`)}
                />
            </>
        )
    }

    return (
        <Catalog
            connectors={catalog.connectors}
            planned={catalog.planned}
            onPick={(t) => router.push(`/admin/connections/new?type=${t}`)}
        />
    )
}

function Catalog({
    connectors,
    planned,
    onPick,
}: {
    connectors: Connector[]
    planned: PlannedConnector[]
    onPick: (type: string) => void
}) {
    const [q, setQ] = useState("")
    const [category, setCategory] = useState("all")
    const all = [
        ...connectors.map((c) => ({ ...c, ready: true as const })),
        ...planned.map((p) => ({ ...p, platforms: null, ready: false as const })),
    ]
    const categories = [...new Set(all.map((c) => c.category))]
    const needle = q.trim().toLowerCase()
    const shown = all.filter(
        (c) =>
            (category === "all" || c.category === category) &&
            (!needle || `${c.label} ${c.description} ${c.category}`.toLowerCase().includes(needle)),
    )

    return (
        <>
            <PageHeader
                eyebrow="Connections"
                title="Add connection"
                description="Choose what kind of source to connect. Each type brings its own settings form; the CIS handles scheduling, checks and history."
            />
            <Panel
                title="Connection types"
                subtitle={
                    planned.length
                        ? `${connectors.length} available · ${planned.length} coming soon`
                        : `${connectors.length} connection types`
                }
                action={<SearchInput value={q} onChange={setQ} placeholder="Search connection types" />}
            >
                <div className="mb-4 overflow-x-auto">
                    <Segmented
                        size="sm"
                        label="Category"
                        value={category}
                        onChange={setCategory}
                        options={[{ value: "all", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]}
                    />
                </div>
                {shown.length === 0 ? (
                    <Empty>No connection types match “{q}”.</Empty>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {shown.map((c) => (
                            <button
                                key={c.type}
                                type="button"
                                disabled={!c.ready}
                                onClick={() => onPick(c.type)}
                                className={cn(
                                    "group border-line bg-surface flex flex-col rounded-2xl border p-4 text-left transition-all duration-200",
                                    c.ready
                                        ? "hover:border-primary/30 hover:shadow-card cursor-pointer hover:-translate-y-0.5"
                                        : "bg-surface-2 cursor-not-allowed",
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <ConnectorIcon icon={c.icon} muted={!c.ready} />
                                    <div className="min-w-0 flex-1">
                                        <div className={cn("text-[14px] font-semibold", c.ready ? "text-ink" : "text-ink-2")}>
                                            {c.label}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            <Pill>{c.category}</Pill>
                                            {!c.ready && <Pill tone="auth">Coming soon</Pill>}
                                        </div>
                                    </div>
                                    {c.ready && (
                                        <ArrowRight className="text-muted group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    )}
                                </div>
                                <p className="text-ink-2 mt-3 text-[12.5px] leading-relaxed">{c.description}</p>
                                {c.ready && (
                                    <p className="text-muted mt-auto pt-3 text-[11.5px]">
                                        Feeds {c.platforms ? c.platforms.map(platformLabel).join(", ") : "any platform"}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </Panel>
        </>
    )
}
