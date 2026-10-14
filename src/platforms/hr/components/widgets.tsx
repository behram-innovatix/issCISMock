"use client"

import { BarsChart, Donut, TrendChart } from "@/components/charts/charts"
import type { LeaderItem } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { fmt, pct, score } from "@/lib/format"
import type { HrAnalysis, ScoredEmployee } from "../analytics"
import { deptOf, locationOf, RATING_TONE, type Rating } from "../data/constants"

export const RATING_COLOR: Record<Rating, string> = {
    Exceeds: "var(--good)",
    Meets: "var(--c1)",
    Developing: "var(--warn)",
    Unsatisfactory: "var(--bad)",
}
export { RATING_TONE }

export const scoreColor = (s: number | undefined) =>
    s == null ? "var(--muted)" : s >= 4.25 ? "var(--good)" : s >= 3.5 ? "var(--c1)" : s >= 2.75 ? "var(--warn)" : "var(--bad)"

export const staffMeta = (e: ScoredEmployee) => `${e.role} · ${locationOf(e.location).short}`
export const staffItem = (e: ScoredEmployee, value: string, tone: LeaderItem["tone"]): LeaderItem => ({
    id: e.id,
    name: e.name,
    meta: staffMeta(e),
    value,
    tone,
    href: `/hr/staff/${e.id}`,
})

export function StaffWeekly({ a, height = 260 }: { a: HrAnalysis; height?: number }) {
    return (
        <TrendChart
            height={height}
            data={a.weeks}
            series={[{ key: "att", label: "Attendance", color: "var(--c2)", fill: true }]}
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

export function DayMix({ a, height = 200 }: { a: HrAnalysis; height?: number }) {
    const tot = a.dayMix.reduce((s, d) => s + d.v, 0)
    return (
        <div className="space-y-4">
            <Donut
                height={height}
                data={a.dayMix}
                center={{ value: pct(a.att), label: "attendance" }}
                format={(v, t) => `${fmt(v)} days · ${pct(t ? (v / t) * 100 : 0)}`}
            />
            <Legend
                className="justify-center"
                items={a.dayMix.map((d) => ({ label: `${d.name} ${pct(tot ? (d.v / tot) * 100 : 0)}`, color: d.color }))}
            />
        </div>
    )
}

export function ScoreDistribution({ a, height = 260 }: { a: HrAnalysis; height?: number }) {
    const color = ["var(--bad)", "var(--warn)", "#f4b860", "var(--c1)", "#5cc394", "var(--good)"]
    return (
        <BarsChart
            height={height}
            data={a.scoreBins.map((b, i) => ({ label: b.label, v: b.v, c: color[i] }))}
            series={[{ key: "v", label: "Staff", color: "var(--c1)" }]}
            colorOf={(r) => String(r.c)}
            valueFormat={(v) => `${fmt(v)} staff`}
            titlePrefix="Score "
        />
    )
}

export const deptName = (code: string) => deptOf(code).name
export const fmtScore = (s?: number) => (s == null ? "–" : score(s))
