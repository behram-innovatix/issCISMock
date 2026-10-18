// The reporting calendar: whole school weeks (Sunday to Thursday) up to the latest attendance mark.
// It comes from the CIS API with the EDU dataset and is applied with applyCalendar() before any
// screen renders; the exports are live bindings, so every importer sees the applied values.

export interface CalendarInput {
    /** first Sunday of the window, YYYY-MM-DD */
    start: string
    /** date of the latest mark, YYYY-MM-DD */
    as_of: string
    weeks: number
    label: string
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu"] as const

export let TERM_LABEL = ""
export let WEEKS: string[] = []
export let NW = 0
/** Data is current to this date. */
export let AS_OF = new Date()

let start = new Date()

const parseDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number)
    return new Date(y, m - 1, d)
}

export const dateOf = (w: number, d: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)

/** Period filter: first week index included. */
export type PeriodKey = number
export let PERIODS: { value: PeriodKey; label: string; long: string }[] = [{ value: 0, label: "All weeks", long: "All weeks" }]

export function applyCalendar(c: CalendarInput) {
    start = parseDate(c.start)
    AS_OF = parseDate(c.as_of)
    NW = c.weeks
    TERM_LABEL = c.label
    WEEKS = Array.from({ length: NW }, (_, w) => dateOf(w, 0).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))
    PERIODS = [
        { value: 0, label: `All ${NW} weeks`, long: `${c.label} (${NW} weeks)` },
        ...[4, 2].filter((n) => n < NW).map((n) => ({ value: NW - n, label: `Last ${n} weeks`, long: `Last ${n} weeks` })),
    ]
}

export const periodLong = (w0: PeriodKey) => PERIODS.find((p) => p.value === w0)?.long ?? PERIODS[0].long
export const weekRange = (w0: number) => Array.from({ length: Math.max(NW - w0, 0) }, (_, i) => w0 + i)
