export const fmt = (n: number) => Math.round(n).toLocaleString("en-GB")

export const pct = (n: number, d = 1) => (Number.isFinite(n) ? n : 0).toFixed(d) + "%"

export const ratio = (n: number, d: number) => (d ? (n / d) * 100 : 0)

export const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n))

export const score = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "–")

/** Compact QAR amount: "QAR 97.9M", "QAR 1.24M", "QAR 845K", "QAR 950". */
export const qar = (n: number) => {
    const a = Math.abs(n)
    const s = n < 0 ? "−" : ""
    return `${s}QAR ${a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M" : a >= 1e4 ? Math.round(a / 1e3) + "K" : fmt(a)}`
}

/** Full QAR amount: "QAR 12,450". */
export const money = (n: number) => `${n < 0 ? "−" : ""}QAR ${fmt(Math.abs(n))}`

/** Axis label for QAR values: "1.2M", "850K". */
export const compact = (n: number) => {
    const a = Math.abs(n)
    const s = n < 0 ? "−" : ""
    return s + (a >= 1e6 ? +(a / 1e6).toFixed(1) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "K" : fmt(a))
}

export const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0)

export const avg = (a: readonly number[]) => (a.length ? sum(a) / a.length : 0)

export const dateLabel = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })

export const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

export const initials = (name: string) =>
    name
        .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/, "")
        .split(" ")
        .map((p) => p.replace("Al-", "")[0])
        .slice(0, 2)
        .join("")
