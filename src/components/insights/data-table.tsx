"use client"

import { cn } from "@/lib/cn"
import { fmt } from "@/lib/format"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

export interface Column<T> {
    key: string
    header: string
    render: (row: T) => ReactNode
    sort?: (row: T) => number | string
    align?: "left" | "right" | "center"
    className?: string
}

/** Controlled, sortable, paginated table. Rows link to a detail page when `href` is given. */
export function DataTable<T>({
    rows,
    columns,
    sort,
    dir,
    page,
    pageSize = 12,
    onSort,
    onPage,
    href,
    rowKey,
    empty = "No records match these filters.",
}: {
    rows: T[]
    columns: Column<T>[]
    sort: string
    dir: 1 | -1
    page: number
    pageSize?: number
    onSort: (key: string, dir: 1 | -1) => void
    onPage: (p: number) => void
    href?: (row: T) => string
    rowKey: (row: T) => string | number
    empty?: string
}) {
    const router = useRouter()
    const col = columns.find((c) => c.key === sort)
    const sorted = col?.sort
        ? [...rows].sort((a, b) => {
              const x = col.sort!(a)
              const y = col.sort!(b)
              return (typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y)) * dir
          })
        : rows
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
    const p = Math.min(page, pages - 1)
    const view = sorted.slice(p * pageSize, p * pageSize + pageSize)

    return (
        <div>
            <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[880px] border-separate border-spacing-y-1 text-[13px]">
                    <thead>
                        <tr>
                            {columns.map((c) => {
                                const on = c.key === sort
                                return (
                                    <th
                                        key={c.key}
                                        scope="col"
                                        className={cn(
                                            "text-muted px-3 pb-1.5 text-[10.5px] font-bold tracking-[.12em] uppercase",
                                            c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                                        )}
                                        aria-sort={on ? (dir === 1 ? "ascending" : "descending") : undefined}
                                    >
                                        {c.sort ? (
                                            <button
                                                type="button"
                                                onClick={() => onSort(c.key, on ? (dir === 1 ? -1 : 1) : -1)}
                                                className={cn(
                                                    "hover:text-ink inline-flex items-center gap-1 uppercase transition-colors",
                                                    on && "text-primary",
                                                )}
                                            >
                                                {c.header}
                                                {on && (dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                                            </button>
                                        ) : (
                                            c.header
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {view.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="bg-surface-2 text-muted rounded-xl px-3 py-10 text-center">
                                    {empty}
                                </td>
                            </tr>
                        )}
                        {view.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={href ? () => router.push(href(row)) : undefined}
                                className={cn("group transition-colors", href && "cursor-pointer")}
                            >
                                {columns.map((c, i) => (
                                    <td
                                        key={c.key}
                                        className={cn(
                                            "bg-surface-2 group-hover:bg-primary-softer px-3 py-2.5 transition-colors",
                                            i === 0 && "rounded-l-xl",
                                            i === columns.length - 1 && "rounded-r-xl",
                                            c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                                            c.className,
                                        )}
                                    >
                                        {c.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-muted mt-3 flex items-center justify-between gap-3 text-[12px]">
                <span>
                    {sorted.length
                        ? `${fmt(p * pageSize + 1)}–${fmt(Math.min(sorted.length, (p + 1) * pageSize))} of ${fmt(sorted.length)}`
                        : "0 results"}
                </span>
                <div className="flex items-center gap-1.5">
                    <PageBtn disabled={p === 0} onClick={() => onPage(p - 1)} label="Previous page">
                        <ChevronLeft className="size-4" />
                    </PageBtn>
                    <span className="tabular text-ink-2 px-2 font-semibold">
                        {p + 1} / {pages}
                    </span>
                    <PageBtn disabled={p >= pages - 1} onClick={() => onPage(p + 1)} label="Next page">
                        <ChevronRight className="size-4" />
                    </PageBtn>
                </div>
            </div>
        </div>
    )
}

function PageBtn({ children, disabled, onClick, label }: { children: ReactNode; disabled: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            className="border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink flex size-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-35"
        >
            {children}
        </button>
    )
}
