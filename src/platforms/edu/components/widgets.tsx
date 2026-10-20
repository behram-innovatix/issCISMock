"use client"

import { BarsChart, Donut, TrendChart } from "@/components/charts/charts"
import type { LeaderItem } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Empty } from "@/components/ui/panel"
import { fmt, pct } from "@/lib/format"
import type { EduAnalysis, ScoredStudent } from "../analytics"
import { CAT_COLOR, CAT_INK, CODES, schoolOf, secName } from "../data/constants"

export const MIX = [
    { key: "P", label: "Present", color: "var(--good)" },
    { key: "L", label: "Late", color: "var(--warn)" },
    { key: "A", label: "Authorised", color: "var(--auth)" },
    { key: "U", label: "Unauthorised", color: "var(--bad)" },
] as const

export function AttendanceMix({ a, height = 200 }: { a: EduAnalysis; height?: number }) {
    const t = a.totals
    const vals = [t.P, t.L, t.A, t.U]
    return (
        <div className="space-y-4">
            <Donut
                height={height}
                data={MIX.map((m, i) => ({ name: m.label, v: vals[i], color: m.color }))}
                center={{ value: pct(a.att), label: "attendance" }}
                format={(v, tot) => `${fmt(v)} sessions · ${pct(tot ? (v / tot) * 100 : 0)}`}
            />
            <Legend
                className="justify-center"
                items={MIX.map((m, i) => ({ label: `${m.label} ${pct(t.TOT ? (vals[i] / t.TOT) * 100 : 0)}`, color: m.color }))}
            />
        </div>
    )
}

export function WeeklyAttendance({ a, height = 260 }: { a: EduAnalysis; height?: number }) {
    return (
        <TrendChart
            height={height}
            data={a.weeks}
            series={[{ key: "att", label: "Attendance", color: "var(--primary)", fill: true }]}
            yDomain={[(min: number) => Math.max(0, Math.floor(Math.min(min, 90) - 2)), 100]}
            yFormat={(v) => `${v}%`}
            valueFormat={(v) => pct(v)}
            target={{ value: 95, label: "Target 95%" }}
            titlePrefix="Week of "
            extraRows={(r) => [
                { label: "Late", value: pct(Number(r.late)), color: "var(--warn)" },
                { label: "Absent", value: pct(Number(r.abs)), color: "var(--bad)" },
            ]}
        />
    )
}

export function PointsBalance({ a, height = 260 }: { a: EduAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.behaviourWeeks}
            series={[
                { key: "ach", label: "Achievement", color: "var(--good)" },
                { key: "inc", label: "Incident", color: "var(--bad)" },
            ]}
            stacked
            signedAbs
            titlePrefix="Week of "
            valueFormat={(v) => `${fmt(v)} pts`}
        />
    )
}

export const studentMeta = (st: ScoredStudent) => [secName(st.yg, st.sec), st.house, schoolOf(st.school).short].filter(Boolean).join(" · ")

export const studentItem = (st: ScoredStudent, value: string, tone: LeaderItem["tone"]): LeaderItem => ({
    id: st.id,
    name: st.name,
    meta: studentMeta(st),
    value,
    tone,
    href: `/edu/students/${st.id}`,
})

export function CodeRows({ counts, limit = 8 }: { counts: number[]; limit?: number }) {
    const rows = CODES.map((c, i) => ({ c, v: counts[i] }))
        .filter((x) => x.c[2] !== "present" && x.c[2] !== "none" && x.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, limit)
    if (!rows.length) return <Empty>No absences or lates recorded.</Empty>
    const max = rows[0].v
    return (
        <ul className="space-y-2.5">
            {rows.map(({ c, v }) => (
                <li key={c[0]} className="flex items-center gap-3">
                    <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-bold"
                        style={{ background: `color-mix(in srgb, ${CAT_COLOR[c[2]]} 13%, transparent)`, color: CAT_INK[c[2]] }}
                    >
                        {c[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-ink mb-1 truncate text-[12px] font-semibold">{c[1]}</div>
                        <div className="bg-bg-2 h-1.5 overflow-hidden rounded-full">
                            <i
                                className="block h-full rounded-full transition-[width] duration-700"
                                style={{ width: `${(v / max) * 100}%`, background: CAT_COLOR[c[2]] }}
                            />
                        </div>
                    </div>
                    <span className="tabular text-ink-2 w-12 text-right text-[12.5px] font-semibold">{fmt(v)}</span>
                </li>
            ))}
        </ul>
    )
}
