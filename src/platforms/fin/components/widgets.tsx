"use client"

import { BarsChart, Donut, TrendChart } from "@/components/charts/charts"
import type { LeaderItem } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { compact, money, pct, qar } from "@/lib/format"
import type { Tone } from "@/lib/status"
import { schoolOf, secName } from "@/platforms/edu/data/constants"
import type { FinAnalysis, ScoredAccount } from "../analytics"
import { ACCOUNT_STATUS, AGEING_COLOR, BUDGET_CATEGORIES, categoryOf, REVENUE_STREAMS } from "../data/constants"

export { ACCOUNT_STATUS }

/** Collection rate against the 95% target: ≥95 good, ≥88 watch, otherwise below target. */
export const collectionTone = (rate: number): Tone => (rate >= 95 ? "good" : rate >= 88 ? "warn" : "bad")
/** Spend vs budget: within +2% good, up to +5% watch, beyond that over budget. */
export const varianceTone = (varPct: number): Tone => (varPct <= 2 ? "good" : varPct <= 5 ? "warn" : "bad")
export const signedPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`
export const catName = (code: string) => categoryOf(code).name

export const accountMeta = (a: ScoredAccount) => `${secName(a.yg, a.sec)} · ${schoolOf(a.school).short}`
export const accountItem = (a: ScoredAccount, value: string, tone: LeaderItem["tone"]): LeaderItem => ({
    id: a.id,
    name: a.name,
    meta: `${accountMeta(a)} · ${a.m.daysOverdue ? `${a.m.daysOverdue} days overdue` : ACCOUNT_STATUS[a.m.status].label}`,
    value,
    tone,
    href: `/fin/accounts/${a.id}`,
})

export function IncomeVsExpense({ a, height = 280 }: { a: FinAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.monthly}
            series={[
                { key: "income", label: "Income", color: "var(--c1)" },
                { key: "expense", label: "Expenditure", color: "var(--c4)" },
            ]}
            yFormat={compact}
            valueFormat={qar}
        />
    )
}

export function CashCurve({ a, height = 260 }: { a: FinAnalysis; height?: number }) {
    return (
        <TrendChart
            height={height}
            data={a.monthly}
            series={[{ key: "cash", label: "Cash position", color: "var(--c2)", fill: true }]}
            yDomain={[(min: number) => Math.min(0, Math.floor(min * 0.9)), "auto"]}
            yFormat={compact}
            valueFormat={qar}
            extraRows={(r) => [{ label: "Net flow", value: qar(Number(r.net)), color: Number(r.net) >= 0 ? "var(--good)" : "var(--bad)" }]}
        />
    )
}

export function RevenueMix({ a, height = 200 }: { a: FinAnalysis; height?: number }) {
    const data = a.streams.filter((s) => s.v > 0)
    return (
        <div className="space-y-4">
            <Donut
                height={height}
                data={data}
                center={{ value: compact(a.income), label: "QAR income" }}
                format={(v, t) => `${qar(v)} · ${pct(t ? (v / t) * 100 : 0)}`}
            />
            <Legend
                className="justify-center"
                items={data.map((s) => ({ label: `${s.name} ${pct(a.income ? (s.v / a.income) * 100 : 0, 0)}`, color: s.color }))}
            />
        </div>
    )
}

export function StreamBars({ a, height = 280 }: { a: FinAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.monthly}
            stacked
            series={REVENUE_STREAMS.map((s) => ({ key: s.code, label: s.name, color: s.color }))}
            yFormat={compact}
            valueFormat={qar}
        />
    )
}

export function CategoryBars({ a, height = 280 }: { a: FinAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.monthly}
            stacked
            series={BUDGET_CATEGORIES.map((c) => ({ key: c.code, label: c.name, color: c.color }))}
            yFormat={compact}
            valueFormat={qar}
        />
    )
}

export function BudgetVsActual({ a, height = 300 }: { a: FinAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.byCategory}
            horizontal
            categoryWidth={170}
            series={[
                { key: "budget", label: "Budget", color: "var(--muted)" },
                { key: "actual", label: "Actual", color: "var(--c1)" },
            ]}
            yFormat={compact}
            valueFormat={qar}
        />
    )
}

export function AgeingBars({ a, height = 240 }: { a: FinAnalysis; height?: number }) {
    return (
        <BarsChart
            height={height}
            data={a.fees.ageing.map((b, i) => ({ ...b, c: AGEING_COLOR[i] }))}
            series={[{ key: "v", label: "Outstanding", color: "var(--c1)" }]}
            colorOf={(r) => String(r.c)}
            yFormat={compact}
            valueFormat={(v) => money(v)}
        />
    )
}

export function CollectionCurve({ a, height = 260 }: { a: FinAnalysis; height?: number }) {
    return (
        <TrendChart
            height={height}
            data={a.fees.curve}
            series={[
                { key: "collected", label: "Collected", color: "var(--c1)", fill: true },
                { key: "target", label: "Target", color: "var(--good)", dashed: true },
            ]}
            yDomain={[(min: number) => Math.max(0, Math.floor(min / 10) * 10), 100]}
            yFormat={(v) => `${v}%`}
            valueFormat={(v) => pct(v)}
            titlePrefix="Week of "
        />
    )
}
