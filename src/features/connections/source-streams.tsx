"use client"

import { Button } from "@/components/ui/button"
import { Empty, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { Check, Copy, Eye, Trash2 } from "lucide-react"
import { useState } from "react"
import {
    ApiError,
    usePreviewStream,
    useRemoveStream,
    useSaveStream,
    useStreamModels,
    type DataSource,
    type StreamField,
    type StreamModel,
    type StreamModelInput,
    type StreamsCatalog,
} from "./api"
import { PreviewTable } from "./source-tables"

const label = (s: string) => s.replaceAll("_", " ")

/** Best guess for a field's column: same name, or a common source variant (uid for id, …). */
function guess(field: string, columns: string[]) {
    const lower = columns.map((c) => c.toLowerCase())
    const candidates = [
        field,
        field === "id" ? "uid" : "",
        `${field}_uid`,
        `${field}_id`,
        field.replace(/_id$/, "_uid"),
        field.replace(/_/g, ""),
    ].filter(Boolean)
    for (const c of candidates) {
        const i = lower.indexOf(c.toLowerCase())
        if (i >= 0) return columns[i]
    }
    return ""
}

/**
 * The Dashboard streams tab of a database source: each of the platform's streams, built from the
 * copied tables by mapping one table's columns, or by a query over the copies.
 */
export function StreamsPanel({ source }: { source: DataSource }) {
    const { data, error } = useStreamModels(source.id)
    const [selected, setSelected] = useState<string | null>(null)

    if (error) return <Empty>{error.message}</Empty>
    if (!data)
        return (
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        )

    const current = data.streams.find((s) => s.stream === selected) ?? data.streams[0]
    const mapped = data.streams.filter((s) => s.model).length

    return (
        <Panel
            title="Dashboard streams"
            subtitle={`${mapped} of ${data.streams.length} streams built from this source. Each one reads the copied tables (see Tables) and feeds the dashboards on every sync.`}
            bodyClassName="-mx-5 -mb-5"
        >
            {data.tables.length === 0 && (
                <p className="bg-warn-soft text-warn-ink mx-5 mb-3 rounded-xl px-3 py-2 text-[12px] font-semibold">
                    Copy at least one table on the Tables tab first; streams are built from the copies.
                </p>
            )}
            <div className="border-line grid border-t md:grid-cols-[240px_1fr]">
                <ul className="border-line bg-surface-2 border-b p-2 md:border-r md:border-b-0" aria-label="Streams">
                    {data.streams.map((s) => (
                        <li key={s.stream}>
                            <button
                                type="button"
                                onClick={() => setSelected(s.stream)}
                                aria-current={s.stream === current.stream}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors",
                                    s.stream === current.stream
                                        ? "bg-surface text-primary shadow-[0_1px_3px_rgba(20,40,90,.12)]"
                                        : "text-ink-2 hover:text-ink",
                                )}
                            >
                                <i
                                    className="size-1.5 shrink-0 rounded-full"
                                    style={{ background: s.model ? "var(--good)" : "var(--line-strong)" }}
                                />
                                <span className="min-w-0 flex-1 truncate">{label(s.stream)}</span>
                                {s.model && (
                                    <span className="text-muted text-[10.5px] font-medium">
                                        {s.model.kind === "table" ? "table" : "query"}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="min-w-0 p-5">
                    <StreamEditor
                        key={current.stream}
                        source={source}
                        catalog={data}
                        stream={current.stream}
                        fields={current.fields}
                        model={current.model}
                    />
                </div>
            </div>
        </Panel>
    )
}

function StreamEditor({
    source,
    catalog,
    stream,
    fields,
    model,
}: {
    source: DataSource
    catalog: StreamsCatalog
    stream: string
    fields: StreamField[]
    model: StreamModel | null
}) {
    const [kind, setKind] = useState<"table" | "query">(model?.kind ?? "table")
    const [tableId, setTableId] = useState<number | null>(model?.source_table_id ?? null)
    const [map, setMap] = useState<Record<string, string>>(model?.column_map ?? {})
    const [filter, setFilter] = useState(model?.filter ?? "")
    const [sql, setSql] = useState(model?.sql ?? "")
    const save = useSaveStream(source.id, stream)
    const remove = useRemoveStream(source.id, stream)
    const preview = usePreviewStream(source.id, stream)
    const table = catalog.tables.find((t) => t.id === tableId)
    const errors = save.error instanceof ApiError ? save.error.errors : preview.error instanceof ApiError ? preview.error.errors : {}
    const problem = errors.sql?.[0] ?? errors.column_map?.[0] ?? errors.source_table_id?.[0]

    const input = (): StreamModelInput =>
        kind === "table" ? { kind, source_table_id: tableId, column_map: map, filter: filter.trim() || null } : { kind, sql }

    const chooseTable = (id: number | null) => {
        setTableId(id)
        const t = catalog.tables.find((x) => x.id === id)
        if (t) setMap(Object.fromEntries(fields.map((f) => [f.name, guess(f.name, t.columns)])))
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-ink text-[15px] font-semibold">{label(stream)}</h3>
                    <p className="text-muted text-[12px]">
                        {model
                            ? `Built from ${model.kind === "table" ? "a table mapping" : "a query"} · saved`
                            : "Not built from this source yet"}
                    </p>
                </div>
                <Segmented
                    label="Build from"
                    value={kind}
                    onChange={(v) => {
                        setKind(v)
                        preview.reset()
                    }}
                    options={[
                        { value: "table", label: "Map a table" },
                        { value: "query", label: "Custom query" },
                    ]}
                />
            </div>

            {kind === "table" ? (
                <>
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Copied table</div>
                        <Select
                            aria-label="Copied table"
                            value={tableId ? String(tableId) : ""}
                            placeholder={catalog.tables.length ? "Choose a table" : "No tables copied yet"}
                            onChange={(e) => chooseTable(e.target.value ? Number(e.target.value) : null)}
                            options={catalog.tables.map((t) => ({ value: String(t.id), label: `${t.qualified} (${t.rows} rows)` }))}
                        />
                    </div>
                    {table && (
                        <div>
                            <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Fields</div>
                            <div className="border-line divide-y divide-[var(--line)] rounded-xl border">
                                {fields.map((f) => (
                                    <div key={f.name} className="flex items-center gap-3 px-3 py-1.5">
                                        <span className="w-44 shrink-0">
                                            <span className="text-ink font-mono text-[12.5px] font-semibold">{f.name}</span>
                                            {f.required && (
                                                <Pill className="ml-1.5" tone="warn">
                                                    required
                                                </Pill>
                                            )}
                                            <span className="text-muted block text-[10.5px]">{f.cast}</span>
                                        </span>
                                        <Select
                                            aria-label={`Column for ${f.name}`}
                                            className="flex-1"
                                            value={map[f.name] ?? ""}
                                            placeholder="— not mapped"
                                            onChange={(e) => setMap((m) => ({ ...m, [f.name]: e.target.value }))}
                                            options={table.columns.map((c) => ({ value: c, label: c }))}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Note className="mt-1.5">Unmapped fields stay empty. Changes in the copy are picked up incrementally.</Note>
                        </div>
                    )}
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Only rows where (optional)</div>
                        <input
                            aria-label="Condition"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="deleted_at IS NULL"
                            className="border-line bg-surface text-ink focus:border-primary/40 focus:ring-primary/10 placeholder:text-muted h-9 w-full rounded-xl border px-3 font-mono text-[12.5px] outline-none focus:ring-4"
                        />
                    </div>
                </>
            ) : (
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div>
                        <div className="border-line bg-surface focus-within:border-primary/40 focus-within:ring-primary/10 overflow-hidden rounded-xl border focus-within:ring-4">
                            <div className="border-line bg-surface-2 text-muted border-b px-3 py-1 text-[10.5px] font-bold tracking-wide uppercase">
                                sql · over the copied tables
                            </div>
                            <textarea
                                aria-label="Query"
                                value={sql}
                                rows={16}
                                spellCheck={false}
                                onChange={(e) => setSql(e.target.value)}
                                placeholder={`SELECT t.uid AS id, t.name AS name, t._cis_synced_at AS updated_at\nFROM {{tbl_example}} t\nWHERE t.deleted_at IS NULL`}
                                className="placeholder:text-muted text-ink block w-full resize-y bg-transparent px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none"
                            />
                        </div>
                        <Note className="mt-1.5">
                            Return the fields as columns ({fields.map((f) => f.name).join(", ")}), with id. Return updated_at (e.g. GREATEST
                            of the tables’ _cis_synced_at) to sync only changed rows. :name uses the connection’s parameters.
                        </Note>
                    </div>
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Copied tables</div>
                        <ul className="border-line max-h-[360px] space-y-0.5 overflow-y-auto rounded-xl border p-1.5">
                            {catalog.tables.map((t) => (
                                <li key={t.id}>
                                    <button
                                        type="button"
                                        title={`Insert ${t.placeholder}`}
                                        onClick={() =>
                                            setSql((s) => `${s}${s && !s.endsWith(" ") && !s.endsWith("\n") ? " " : ""}${t.placeholder}`)
                                        }
                                        className="hover:bg-bg-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left font-mono text-[11.5px]"
                                    >
                                        <Copy className="text-muted size-3 shrink-0" />
                                        <span className="text-ink truncate">{t.placeholder}</span>
                                    </button>
                                </li>
                            ))}
                            {catalog.tables.length === 0 && <li className="text-muted px-2 py-1 text-[11.5px]">None yet</li>}
                        </ul>
                    </div>
                </div>
            )}

            {problem && (
                <p className="bg-bad-soft text-bad-ink rounded-xl px-3 py-2 text-[12px] font-semibold whitespace-pre-line">{problem}</p>
            )}
            {preview.data && !problem && (
                <div>
                    <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">
                        Preview · {preview.data.rows.length} rows · columns {preview.data.columns.join(", ")}
                    </div>
                    <PreviewTable rows={preview.data.rows} columns={preview.data.columns} />
                </div>
            )}
            {save.isSuccess && !save.isPending && (
                <p className="bg-good-soft text-good-ink rounded-xl px-3 py-2 text-[12px] font-semibold">
                    Saved. The next sync rebuilds {label(stream)} from scratch.
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {model && (
                    <Button
                        className="text-bad-ink mr-auto"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate()}
                        title="Stop building this stream from this source"
                    >
                        <Trash2 className="size-4" /> Remove
                    </Button>
                )}
                <Button onClick={() => preview.mutate(input())} disabled={preview.isPending || (kind === "table" ? !tableId : !sql.trim())}>
                    <Eye className="size-4" /> {preview.isPending ? "Running…" : "Preview"}
                </Button>
                <Button
                    variant="primary"
                    onClick={() => save.mutate(input())}
                    disabled={save.isPending || (kind === "table" ? !tableId : !sql.trim())}
                >
                    <Check className="size-4" /> {save.isPending ? "Checking…" : "Save"}
                </Button>
            </div>
        </div>
    )
}
