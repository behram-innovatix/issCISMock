"use client"

import { SearchInput } from "@/components/insights/search-input"
import { Button } from "@/components/ui/button"
import { Empty, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { fmt } from "@/lib/format"
import { Check, Eye, KeyRound, Plus, RefreshCw, Table2, Trash2, X } from "lucide-react"
import { useState } from "react"
import {
    ApiError,
    usePreviewTable,
    useRemoveTable,
    useSaveTable,
    useSourceTable,
    useSourceTables,
    type DataSource,
    type SourceTableRow,
    type TableDetail,
} from "./api"
import { ago } from "./shared"

const PAGE = 60

/**
 * The Tables tab of a database source: every table the connection can see, which of them are
 * copied into the CIS, and a drawer to add, change or remove a copy.
 */
export function TablesPanel({ source }: { source: DataSource }) {
    const { data, error, isLoading, refresh } = useSourceTables(source.id)
    const [q, setQ] = useState("")
    const [show, setShow] = useState<"all" | "copied">("all")
    const [open, setOpen] = useState<string | null>(null)
    const [limit, setLimit] = useState(PAGE)

    const tables = data?.tables ?? []
    const copied = tables.filter((t) => t.selection)
    const needle = q.trim().toLowerCase()
    const rows = (show === "copied" ? copied : tables).filter((t) => !needle || t.qualified.toLowerCase().includes(needle))

    return (
        <>
            <Panel
                title="Tables"
                subtitle={
                    data
                        ? `${fmt(tables.length)} tables in the source · ${copied.length} copied into the CIS. Copied tables sync on the source’s schedule and feed the dashboard streams.`
                        : "Reading the source’s tables…"
                }
                action={
                    <Button size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending} title="Read the table list again">
                        <RefreshCw className={cn("size-3.5", refresh.isPending && "animate-spin")} /> Refresh
                    </Button>
                }
                bodyClassName="-mx-5 -mb-5"
            >
                <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
                    <SearchInput
                        value={q}
                        onChange={(v) => {
                            setQ(v)
                            setLimit(PAGE)
                        }}
                        placeholder="Search tables"
                    />
                    <Segmented
                        size="sm"
                        label="Show"
                        value={show}
                        onChange={setShow}
                        options={[
                            { value: "all", label: `All ${tables.length}` },
                            { value: "copied", label: `Copied ${copied.length}` },
                        ]}
                    />
                </div>
                {error ? (
                    <p className="bg-bad-soft text-bad-ink mx-5 mb-5 rounded-xl px-3 py-2 text-[12px] font-semibold">{error.message}</p>
                ) : isLoading ? (
                    <div className="space-y-2 px-5 pb-5">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="h-12" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-5 pb-5">
                        <Empty>
                            {show === "copied" && !needle
                                ? "No tables copied yet. Add one from the list of all tables."
                                : `No tables match “${q}”.`}
                        </Empty>
                    </div>
                ) : (
                    <ul className="border-line border-t">
                        {rows.slice(0, limit).map((t) => (
                            <TableRow key={t.qualified} table={t} onOpen={() => setOpen(t.qualified)} />
                        ))}
                        {rows.length > limit && (
                            <li className="px-5 py-3 text-center">
                                <Button size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                                    Show more ({fmt(rows.length - limit)} left)
                                </Button>
                            </li>
                        )}
                    </ul>
                )}
            </Panel>
            {open && <TableDrawer source={source} name={open} onClose={() => setOpen(null)} />}
        </>
    )
}

function TableRow({ table: t, onOpen }: { table: SourceTableRow; onOpen: () => void }) {
    const s = t.selection
    return (
        <li className="border-line hover:bg-bg/60 flex flex-wrap items-center gap-3 border-b px-5 py-2.5 transition-colors last:border-b-0">
            <span
                className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    s ? (s.last_error ? "bg-bad-soft text-bad-ink" : "bg-good-soft text-good-ink") : "bg-bg-2 text-muted",
                )}
            >
                <Table2 className="size-4" />
            </span>
            <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
                <div className="text-ink flex flex-wrap items-center gap-2 font-mono text-[12.5px] font-semibold">
                    {t.qualified}
                    {t.missing && <Pill tone="bad">Gone from source</Pill>}
                    {s?.used_by.map((stream) => (
                        <Pill key={stream} tone="info">
                            {stream.replaceAll("_", " ")}
                        </Pill>
                    ))}
                </div>
                <div className="text-muted text-[11.5px]">
                    {t.rows !== null ? `~${fmt(t.rows)} rows in source` : "Row count unknown"}
                    {s &&
                        ` · ${fmt(s.rows)} copied · ${s.copied_columns.length} columns · ${s.cursor_column ? `incremental on ${s.cursor_column}` : "read whole"} · synced ${ago(s.last_synced_at).toLowerCase()}`}
                    {s?.filter && " · filtered"}
                </div>
                {s?.last_error && <div className="text-bad-ink text-[11.5px] font-semibold">{s.last_error}</div>}
            </button>
            {s ? (
                <Button size="sm" onClick={onOpen}>
                    Edit
                </Button>
            ) : (
                <Button size="sm" variant="soft" onClick={onOpen}>
                    <Plus className="size-3.5" /> Add
                </Button>
            )}
        </li>
    )
}

/** Choose how a table is copied: columns, key, incremental column and filter, with a preview. */
function TableDrawer({ source, name, onClose }: { source: DataSource; name: string; onClose: () => void }) {
    const { data: detail, error } = useSourceTable(source.id, name)

    return (
        <div className="animate-fade bg-ink/25 fixed inset-0 z-[60] flex justify-end backdrop-blur-[2px]" onClick={onClose}>
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={`Copy ${name}`}
                onClick={(e) => e.stopPropagation()}
                className="animate-rise bg-surface shadow-pop flex h-full w-full max-w-[640px] flex-col overflow-hidden"
            >
                <header className="border-line flex items-start gap-3 border-b px-6 py-4">
                    <div className="min-w-0 flex-1">
                        <div className="eyebrow text-primary/80">{detail?.selection ? "Copied table" : "Add table"}</div>
                        <h2 className="font-display text-ink truncate font-mono text-[17px] font-semibold">{name}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted hover:bg-bg-2 hover:text-ink rounded-lg p-1.5"
                        aria-label="Close"
                    >
                        <X className="size-4" />
                    </button>
                </header>
                {error ? (
                    <p className="bg-bad-soft text-bad-ink m-6 rounded-xl px-3 py-2 text-[12px] font-semibold">{error.message}</p>
                ) : !detail ? (
                    <div className="space-y-3 p-6">
                        <Skeleton className="h-10" />
                        <Skeleton className="h-64" />
                    </div>
                ) : (
                    <TableForm key={detail.qualified} source={source} detail={detail} onDone={onClose} />
                )}
            </aside>
        </div>
    )
}

function TableForm({ source, detail, onDone }: { source: DataSource; detail: TableDetail; onDone: () => void }) {
    const sel = detail.selection
    const copyable = detail.columns.filter((c) => c.replicable).map((c) => c.name)
    const [columns, setColumns] = useState<string[]>(sel?.copied_columns.length ? sel.copied_columns : copyable)
    const [key, setKey] = useState<string[]>(sel?.primary_key ?? detail.primary_key)
    const [cursor, setCursor] = useState<string>(sel ? (sel.cursor_column ?? "") : (detail.suggested_cursor ?? ""))
    const [filter, setFilter] = useState(sel?.filter ?? "")
    const [confirmRemove, setConfirmRemove] = useState(false)
    const save = useSaveTable(source.id, detail.qualified)
    const remove = useRemoveTable(source.id)
    const preview = usePreviewTable(source.id, detail.qualified)
    const errors = save.error instanceof ApiError ? save.error.errors : {}
    const chosen = new Set([...columns, ...key, ...(cursor ? [cursor] : [])])
    const all = copyable.every((c) => chosen.has(c))

    const toggle = (c: string) => setColumns((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
    const input = () => ({
        columns: all ? null : [...chosen],
        primary_key: key,
        cursor_column: cursor || null,
        filter: filter.trim() || null,
    })

    return (
        <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <section>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-ink-2 text-[12px] font-semibold">
                            Columns to copy ({chosen.size} of {copyable.length})
                        </span>
                        <div className="flex gap-1">
                            <Button size="sm" onClick={() => setColumns(copyable)}>
                                All
                            </Button>
                            <Button size="sm" onClick={() => setColumns([])}>
                                Key only
                            </Button>
                        </div>
                    </div>
                    <p className="text-muted mb-2 text-[11.5px]">Leave out what the dashboards don’t need, personal details especially.</p>
                    <ul className="border-line max-h-[280px] divide-y divide-[var(--line)] overflow-y-auto rounded-xl border">
                        {detail.columns.map((c) => {
                            const locked = key.includes(c.name) || cursor === c.name
                            const on = chosen.has(c.name)
                            return (
                                <li key={c.name}>
                                    <label
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-1.5 text-[12.5px]",
                                            c.replicable ? "hover:bg-bg/60 cursor-pointer" : "cursor-not-allowed opacity-50",
                                        )}
                                        title={c.replicable ? undefined : "Binary and spatial columns aren’t copied"}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            disabled={!c.replicable || locked}
                                            onChange={() => toggle(c.name)}
                                            className="accent-[var(--primary)]"
                                        />
                                        <span className="text-ink min-w-0 flex-1 truncate font-mono">{c.name}</span>
                                        {key.includes(c.name) && <KeyRound className="text-warn size-3.5" aria-label="Key" />}
                                        <span className="text-muted font-mono text-[11px]">{c.type}</span>
                                    </label>
                                </li>
                            )
                        })}
                    </ul>
                    {errors.columns && <p className="text-bad-ink mt-1.5 text-[11.5px] font-semibold">{errors.columns[0]}</p>}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Key</div>
                        <Select
                            aria-label="Key column"
                            value={key[0] ?? ""}
                            placeholder="Choose the column that identifies a row"
                            onChange={(e) =>
                                setKey(e.target.value ? [e.target.value, ...key.slice(1).filter((k) => k !== e.target.value)] : [])
                            }
                            options={copyable.map((c) => ({ value: c, label: c }))}
                        />
                        <p className={cn("mt-1.5 text-[11.5px]", errors.primary_key ? "text-bad-ink font-semibold" : "text-muted")}>
                            {errors.primary_key?.[0] ??
                                (detail.primary_key.length
                                    ? `The source’s primary key is ${detail.primary_key.join(" + ")}.`
                                    : "The source has no primary key: choose a unique column.")}
                        </p>
                    </div>
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Incremental column</div>
                        <Select
                            aria-label="Incremental column"
                            value={cursor}
                            placeholder="None: read the whole table each sync"
                            onChange={(e) => setCursor(e.target.value)}
                            options={detail.columns
                                .filter((c) => c.replicable)
                                .map((c) => ({ value: c.name, label: `${c.name} · ${c.type_name}` }))}
                        />
                        <p className="text-muted mt-1.5 text-[11.5px]">A last-changed timestamp, so each sync only copies changed rows.</p>
                    </div>
                </section>

                <section>
                    <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Row filter (optional)</div>
                    <textarea
                        aria-label="Row filter"
                        value={filter}
                        rows={2}
                        spellCheck={false}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="date >= :from_date"
                        className="border-line bg-surface text-ink focus:border-primary/40 focus:ring-primary/10 placeholder:text-muted w-full resize-y rounded-xl border px-3 py-2 font-mono text-[12.5px] outline-none focus:ring-4"
                    />
                    <p className={cn("mt-1 text-[11.5px]", errors.filter ? "text-bad-ink font-semibold" : "text-muted")}>
                        {errors.filter?.[0] ??
                            "A WHERE condition in the source’s SQL, to copy only some rows. :name uses the connection’s parameters."}
                    </p>
                </section>

                <section>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-ink-2 text-[12px] font-semibold">Preview</span>
                        <Button
                            size="sm"
                            onClick={() => preview.mutate({ columns: all ? null : [...chosen], filter: filter.trim() || null })}
                            disabled={preview.isPending}
                        >
                            <Eye className="size-3.5" /> {preview.isPending ? "Reading…" : "Preview rows"}
                        </Button>
                    </div>
                    {preview.error ? (
                        <p className="bg-bad-soft text-bad-ink rounded-xl px-3 py-2 text-[12px] font-semibold">{preview.error.message}</p>
                    ) : preview.data ? (
                        <PreviewTable rows={preview.data.rows} />
                    ) : (
                        <Note>The first rows of the source table, as they would be copied.</Note>
                    )}
                </section>

                {sel && (
                    <section className="border-line rounded-xl border p-3 text-[12px]">
                        <div className="text-ink font-semibold">In the CIS</div>
                        <div className="text-muted mt-0.5">
                            {fmt(sel.rows)} rows copied to <span className="font-mono">{sel.replica_table}</span> · last synced{" "}
                            {ago(sel.last_synced_at).toLowerCase()}
                            {sel.used_by.length > 0 && ` · used by ${sel.used_by.join(", ")}`}
                        </div>
                    </section>
                )}
            </div>

            <footer className="border-line bg-bg/80 flex flex-wrap items-center gap-2 border-t px-6 py-3">
                {sel &&
                    (confirmRemove ? (
                        <span className="mr-auto flex items-center gap-2 text-[12px]">
                            <span className="text-ink-2">Stop copying and drop the copy?</span>
                            <Button
                                size="sm"
                                variant="danger"
                                disabled={remove.isPending}
                                onClick={() => remove.mutate(detail.qualified, { onSuccess: onDone })}
                            >
                                Remove
                            </Button>
                            <Button size="sm" onClick={() => setConfirmRemove(false)}>
                                Keep
                            </Button>
                        </span>
                    ) : (
                        <Button
                            className="text-bad-ink mr-auto"
                            onClick={() => setConfirmRemove(true)}
                            disabled={sel.used_by.length > 0}
                            title={sel.used_by.length ? `Used by ${sel.used_by.join(", ")}` : undefined}
                        >
                            <Trash2 className="size-4" /> Remove
                        </Button>
                    ))}
                {(remove.error || (save.error && !Object.keys(errors).length)) && (
                    <p className="text-bad-ink w-full text-[12px] font-semibold">{(remove.error ?? save.error)?.message}</p>
                )}
                <Button onClick={onDone}>Cancel</Button>
                <Button
                    variant="primary"
                    disabled={save.isPending || key.length === 0}
                    onClick={() => save.mutate(input(), { onSuccess: onDone })}
                >
                    <Check className="size-4" /> {save.isPending ? "Saving…" : sel ? "Save" : "Copy this table"}
                </Button>
            </footer>
        </>
    )
}

/** Rows as a scrollable grid (previews of tables and streams). */
export function PreviewTable({ rows, columns }: { rows: Record<string, unknown>[]; columns?: string[] }) {
    const cols = columns ?? Object.keys(rows[0] ?? {})
    if (rows.length === 0) return <Empty>No rows.</Empty>
    return (
        <div className="border-line max-h-[320px] overflow-auto rounded-xl border">
            <table className="w-full text-[11.5px]">
                <thead className="bg-surface-2 sticky top-0">
                    <tr>
                        {cols.map((c) => (
                            <th
                                key={c}
                                className="text-muted border-line border-b px-2.5 py-1.5 text-left font-mono font-semibold whitespace-nowrap"
                            >
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-line border-b last:border-b-0">
                            {cols.map((c) => (
                                <td
                                    key={c}
                                    className="text-ink-2 max-w-[220px] truncate px-2.5 py-1.5 font-mono whitespace-nowrap"
                                    title={String(r[c] ?? "")}
                                >
                                    {r[c] === null || r[c] === undefined ? <span className="text-muted">null</span> : String(r[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
