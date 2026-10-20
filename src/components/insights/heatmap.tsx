import { Tip } from "@/components/ui/tip"
import type { ReactNode } from "react"

/**
 * Rows × columns grid of coloured cells with tooltips. Used for day-of-week attendance (EDU)
 * and staff lateness (HR).
 */
export function Heatmap({
    rows,
    cols,
    values,
    color,
    format,
    tip,
}: {
    rows: readonly string[]
    cols: readonly string[]
    /** values[col][row]; null for a day without data (a holiday) */
    values: (number | null)[][]
    color: (v: number) => string
    format: (v: number) => string
    tip: (row: number, col: number, v: number) => ReactNode
}) {
    return (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `40px repeat(${cols.length}, minmax(0,1fr))` }}>
            <div />
            {cols.map((c) => (
                <div key={c} className="text-muted truncate pb-1 text-center text-[10.5px] font-semibold">
                    {c}
                </div>
            ))}
            {rows.map((r, ri) => (
                <Row key={r} label={r}>
                    {cols.map((c, ci) => {
                        const v = values[ci][ri]
                        if (v === null)
                            return (
                                <div
                                    key={c}
                                    className="bg-bg-2 text-muted flex h-9 items-center justify-center rounded-lg text-[11px] font-semibold"
                                    title="No school or no marks"
                                >
                                    –
                                </div>
                            )
                        return (
                            <Tip key={c} content={tip(ri, ci, v)}>
                                <div
                                    className="tabular flex h-9 items-center justify-center rounded-lg text-[11px] font-semibold text-white transition-transform duration-200 hover:scale-[1.06]"
                                    style={{ background: color(v) }}
                                >
                                    {format(v)}
                                </div>
                            </Tip>
                        )
                    })}
                </Row>
            ))}
        </div>
    )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <>
            <div className="text-ink-2 flex items-center text-[11.5px] font-semibold">{label}</div>
            {children}
        </>
    )
}
