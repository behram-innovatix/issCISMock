// Term 1 2026–27: school week Sun–Thu, term starts Sun 23 Aug 2026, data to Thu 8 Oct 2026.
export const TERM_LABEL = "Term 1 · 2026–27"
export const WEEKS = ["23 Aug", "30 Aug", "6 Sep", "13 Sep", "20 Sep", "27 Sep", "4 Oct"] as const
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu"] as const
export const NW = WEEKS.length
export const dateOf = (w: number, d: number) => new Date(2026, 7, 23 + w * 7 + d)

/** Period filter: first week index included. */
export type PeriodKey = 0 | 3 | 5
export const PERIODS: { value: PeriodKey; label: string; long: string }[] = [
    { value: 0, label: "Term to date", long: "Term to date (7 weeks)" },
    { value: 3, label: "Last 4 weeks", long: "Last 4 weeks" },
    { value: 5, label: "Last 2 weeks", long: "Last 2 weeks" },
]
export const periodLong = (w0: PeriodKey) => PERIODS.find((p) => p.value === w0)!.long
export const weekRange = (w0: number) => Array.from({ length: NW - w0 }, (_, i) => w0 + i)
