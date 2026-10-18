import { Tip } from "@/components/ui/tip"
import { AS_OF, dateOf, NW } from "@/lib/calendar"
import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

/** Every month the reporting window touches, from its first Sunday to the data date. */
function windowMonths() {
    const start = dateOf(0, 0)
    const months: { y: number; m: number }[] = []
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= AS_OF; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        months.push({ y: d.getFullYear(), m: d.getMonth() })
    }
    return months
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Maps a calendar date to the term's (week, day) index, or null if it is not a recorded school day. */
export function termIndex(dt: Date): { w: number; d: number } | null {
    const start = dateOf(0, 0)
    const diff = Math.round((dt.getTime() - start.getTime()) / 86400000)
    if (diff < 0) return null
    const w = Math.floor(diff / 7)
    const d = diff % 7
    return w < NW && d < 5 ? { w, d } : null
}

export interface DayCell {
    /** one colour per session (AM/PM for students, one for staff) */
    parts: string[]
    tip: ReactNode
}

/** Month grid of the reporting window. Weekends (Fri/Sat) are hatched, days outside the window are dashed. */
export function TermCalendar({ cell }: { cell: (w: number, d: number, date: Date) => DayCell }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
            {windowMonths().map(({ y, m }) => {
                const first = new Date(y, m, 1)
                const days = new Date(y, m + 1, 0).getDate()
                const lead = first.getDay()
                return (
                    <div key={`${y}-${m}`}>
                        <div className="text-ink mb-2 text-[12.5px] font-semibold">
                            {first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {WEEKDAYS.map((d) => (
                                <div key={d} className="text-muted pb-0.5 text-center text-[9.5px] font-bold tracking-wide uppercase">
                                    {d[0]}
                                </div>
                            ))}
                            {Array.from({ length: lead }, (_, i) => (
                                <div key={"l" + i} />
                            ))}
                            {Array.from({ length: days }, (_, i) => {
                                const dt = new Date(y, m, i + 1)
                                const dow = dt.getDay()
                                const idx = termIndex(dt)
                                const num = <span className="absolute top-0.5 left-1 text-[9.5px] font-semibold">{i + 1}</span>
                                if (dow === 5 || dow === 6)
                                    return (
                                        <div key={i} className="hatch text-muted/70 relative aspect-square rounded-md">
                                            {num}
                                        </div>
                                    )
                                if (!idx)
                                    return (
                                        <div
                                            key={i}
                                            className="border-line-strong text-muted/70 relative aspect-square rounded-md border border-dashed"
                                        >
                                            {num}
                                        </div>
                                    )
                                const c = cell(idx.w, idx.d, dt)
                                return (
                                    <Tip key={i} content={c.tip}>
                                        <div className="relative flex aspect-square flex-col overflow-hidden rounded-md text-white transition-transform duration-150 hover:scale-110">
                                            {c.parts.map((color, k) => (
                                                <i
                                                    key={k}
                                                    className={cn("flex-1", k > 0 && "border-t border-white/70")}
                                                    style={{ background: color }}
                                                />
                                            ))}
                                            {num}
                                        </div>
                                    </Tip>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
