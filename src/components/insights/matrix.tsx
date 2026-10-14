"use client"

import { cn } from "@/lib/cn"
import { fmt, pct } from "@/lib/format"
import type { Tone } from "@/lib/status"
import { Fragment } from "react"

const TONE: Record<Tone, string> = {
    good: "bg-good-soft text-good-ink hover:ring-good/30",
    warn: "bg-warn-soft text-warn-ink hover:ring-warn/30",
    bad: "bg-bad-soft text-bad-ink hover:ring-bad/30",
}

/** 3×3 matrix (attendance × behaviour for students, performance × attendance for staff). Cells are clickable. */
export function Matrix({
    rows,
    cols,
    counts,
    colCaption,
    tone,
    onSelect,
}: {
    rows: readonly (readonly [string, string])[]
    cols: readonly (readonly [string, string])[]
    /** counts[row][col] */
    counts: number[][]
    colCaption: string
    tone: (row: number, col: number) => Tone
    onSelect?: (row: number, col: number) => void
}) {
    const n = counts.flat().reduce((a, b) => a + b, 0) || 1
    return (
        <div className="grid grid-cols-[minmax(92px,0.9fr)_repeat(3,minmax(0,1fr))] gap-2">
            <div />
            {cols.map(([v]) => (
                <div key={v} className="px-1 pb-1 text-center">
                    <span className="eyebrow block">{colCaption}</span>
                    <b className="text-ink-2 text-[12px] font-semibold">{v}</b>
                </div>
            ))}
            {rows.map(([v, l], ri) => (
                <Fragment key={v}>
                    <div className="flex flex-col justify-center pr-1">
                        <b className="text-ink text-[12.5px] font-semibold">{l}</b>
                        <span className="text-muted text-[11px]">{v}</span>
                    </div>
                    {cols.map(([cv], ci) => {
                        const c = counts[ri][ci]
                        return (
                            <button
                                key={cv}
                                type="button"
                                disabled={!c || !onSelect}
                                onClick={() => onSelect?.(ri, ci)}
                                aria-label={`${c} in ${l}, ${colCaption} ${cv}`}
                                className={cn(
                                    "flex min-h-[74px] flex-col items-center justify-center rounded-xl ring-2 ring-transparent transition-all duration-200",
                                    TONE[tone(ri, ci)],
                                    c && onSelect ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
                                    !c && "opacity-45",
                                )}
                            >
                                <b className="tabular font-display text-[20px] leading-none font-semibold">{fmt(c)}</b>
                                <span className="mt-1 text-[11px] opacity-80">{pct((c / n) * 100)}</span>
                            </button>
                        )
                    })}
                </Fragment>
            ))}
        </div>
    )
}
