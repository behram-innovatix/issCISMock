export type Tone = "good" | "warn" | "bad"
export type PillTone = Tone | "auth" | "info" | "neutral"

/** Attendance against the 95% target: ≥95 good, ≥90 watch, otherwise below target. */
export const statusOf = (att: number): Tone => (att >= 95 ? "good" : att >= 90 ? "warn" : "bad")

export const STATUS_LABEL: Record<Tone, string> = { good: "On track", warn: "Watch", bad: "At risk" }
export const ATT_LABEL: Record<Tone, string> = { good: "On target", warn: "Watch", bad: "Below target" }

export const toneVar = (t: PillTone) => (t === "info" ? "var(--primary)" : t === "neutral" ? "var(--muted)" : `var(--${t})`)
