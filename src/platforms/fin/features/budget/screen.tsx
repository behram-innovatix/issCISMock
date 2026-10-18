"use client"

import { TrendChart } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { Meter } from "@/components/ui/meter"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Tip } from "@/components/ui/tip"
import { cn } from "@/lib/cn"
import { compact, pct, qar } from "@/lib/format"
import { locationOf } from "@/platforms/hr/data/constants"
import { CalendarRange, Flag, Gauge, PiggyBank, Target, TrendingUp } from "lucide-react"
import { FinPage } from "../../components/fin-page"
import { catName, signedPct, varianceTone } from "../../components/widgets"
import { BUDGET_CATEGORIES } from "../../data/constants"

const TONE_CELL = {
    good: "bg-good-soft text-good-ink",
    warn: "bg-warn-soft text-warn-ink",
    bad: "bg-bad-soft text-bad-ink",
} as const

export function FinBudgetScreen() {
    return (
        <FinPage
            title="Budget vs Actual"
            description="How spending is tracking against the approved FY 2026 budget, by category and location."
        >
            {({ a }) => {
                const b = a.budget
                const vt = varianceTone(b.varPct)
                const gap = b.forecast - b.annual
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Annual budget"
                                icon={<PiggyBank />}
                                color="var(--c1)"
                                value={qar(b.annual)}
                                foot={<span>FY 2026 approved</span>}
                            />
                            <Kpi
                                label="Budget for period"
                                icon={<CalendarRange />}
                                color="var(--c2)"
                                value={qar(b.budget)}
                                foot={<span>phased by month</span>}
                            />
                            <Kpi
                                label="Actual spend"
                                icon={<Gauge />}
                                color="var(--c4)"
                                value={qar(b.actual)}
                                foot={<span>{pct(b.used, 0)} of annual budget used</span>}
                            />
                            <Kpi
                                label="Variance"
                                icon={<Target />}
                                color={`var(--${vt})`}
                                value={signedPct(b.varPct)}
                                foot={<Pill tone={vt}>{b.variance > 0 ? `${qar(b.variance)} over` : `${qar(-b.variance)} under`}</Pill>}
                            />
                            <Kpi
                                label="Year-end forecast"
                                icon={<TrendingUp />}
                                color={gap > 0 ? "var(--bad)" : "var(--good)"}
                                value={qar(b.forecast)}
                                foot={<span>{gap > 0 ? `${qar(gap)} over budget` : `${qar(-gap)} under budget`}</span>}
                            />
                            <Kpi
                                label="Lines over budget"
                                icon={<Flag />}
                                color="var(--bad)"
                                value={String(a.overBudget.length)}
                                foot={<span>of {a.budgetLines.length} budget lines (&gt; 5%)</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Cumulative spend vs budget"
                                subtitle="Running total through the period · October is month to date"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Actual", color: "var(--c4)" },
                                            { label: "Budget", color: "var(--muted)", dashed: true },
                                        ]}
                                    />
                                }
                            >
                                <TrendChart
                                    height={280}
                                    data={a.monthly}
                                    series={[
                                        { key: "actualCum", label: "Actual", color: "var(--c4)", fill: true },
                                        { key: "budgetCum", label: "Budget", color: "var(--muted)", dashed: true },
                                    ]}
                                    yDomain={[0, "auto"]}
                                    yFormat={compact}
                                    valueFormat={qar}
                                />
                            </Panel>
                            <Panel span={4} title="Biggest overspends" subtitle="Budget lines furthest above plan">
                                {a.overBudget.length ? (
                                    <ul className="space-y-3">
                                        {a.budgetLines.slice(0, 6).map((l) => {
                                            const t = varianceTone(l.varPct)
                                            return (
                                                <li key={l.location + l.category} className="flex items-center gap-3">
                                                    <span className="min-w-0 flex-1">
                                                        <b className="text-ink block truncate text-[13px] font-semibold">
                                                            {catName(l.category)}
                                                        </b>
                                                        <span className="text-muted block text-[11.5px]">
                                                            {locationOf(l.location).short} · {qar(l.actual)} vs {qar(l.budget)}
                                                        </span>
                                                    </span>
                                                    <Pill tone={t}>{signedPct(l.varPct)}</Pill>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <Empty>Every budget line is within 5% of plan.</Empty>
                                )}
                            </Panel>
                            <Panel span={7} title="By category" subtitle="Budget, actual and annual budget used">
                                <div className="-mx-1 overflow-x-auto px-1">
                                    <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-[13px]">
                                        <thead>
                                            <tr className="text-muted text-[10.5px] font-bold tracking-[.12em] uppercase">
                                                <th className="px-3 pb-1.5 text-left">Category</th>
                                                <th className="px-3 pb-1.5 text-right">Budget</th>
                                                <th className="px-3 pb-1.5 text-right">Actual</th>
                                                <th className="px-3 pb-1.5 text-right">Variance</th>
                                                <th className="w-[150px] px-3 pb-1.5 text-left">Annual used</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {a.byCategory.map((c) => (
                                                <tr key={c.key} className="group">
                                                    <td className="bg-surface-2 group-hover:bg-primary-softer rounded-l-xl px-3 py-2.5 transition-colors">
                                                        <span className="flex items-center gap-2">
                                                            <i
                                                                className="size-2.5 shrink-0 rounded-[3px]"
                                                                style={{ background: c.color }}
                                                            />
                                                            <b className="text-ink font-semibold">{c.label}</b>
                                                        </span>
                                                    </td>
                                                    <td className="tabular bg-surface-2 text-ink-2 group-hover:bg-primary-softer px-3 py-2.5 text-right transition-colors">
                                                        {qar(c.budget)}
                                                    </td>
                                                    <td className="tabular bg-surface-2 text-ink group-hover:bg-primary-softer px-3 py-2.5 text-right font-semibold transition-colors">
                                                        {qar(c.actual)}
                                                    </td>
                                                    <td className="bg-surface-2 group-hover:bg-primary-softer px-3 py-2.5 text-right transition-colors">
                                                        <Pill tone={varianceTone(c.varPct)}>{signedPct(c.varPct)}</Pill>
                                                    </td>
                                                    <td className="bg-surface-2 group-hover:bg-primary-softer rounded-r-xl px-3 py-2.5 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Meter value={c.used} color={c.color} className="flex-1" />
                                                            <span className="tabular text-muted w-9 text-right text-[11.5px]">
                                                                {pct(c.used, 0)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>
                            <Panel span={5} title="Variance by location" subtitle="Actual vs phased budget for each category">
                                <div
                                    className="grid gap-1.5"
                                    style={{
                                        gridTemplateColumns: `minmax(150px,1.5fr) repeat(${a.budgetByLocation.length}, minmax(0,1fr))`,
                                    }}
                                >
                                    <div />
                                    {a.budgetByLocation.map((l) => (
                                        <div key={l.key} className="text-muted truncate pb-1 text-center text-[10.5px] font-semibold">
                                            {l.label}
                                        </div>
                                    ))}
                                    {BUDGET_CATEGORIES.map((c, ci) => (
                                        <div key={c.code} className="contents">
                                            <div className="text-ink-2 flex items-center truncate text-[11.5px] font-semibold">
                                                {c.name}
                                            </div>
                                            {a.budgetByLocation.map((l, li) => {
                                                const v = a.varianceHeat[ci][li]
                                                return (
                                                    <Tip
                                                        key={l.key}
                                                        content={v == null ? "No budget line" : `${c.name} · ${l.label}: ${signedPct(v)}`}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "tabular flex h-9 items-center justify-center rounded-lg text-[11px] font-semibold transition-transform duration-200 hover:scale-[1.06]",
                                                                v == null ? "bg-bg-2 text-muted" : TONE_CELL[varianceTone(v)],
                                                            )}
                                                        >
                                                            {v == null ? "–" : signedPct(v)}
                                                        </div>
                                                    </Tip>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                                <Note className="mt-3">Green is within 2% of budget, amber up to 5% over, red more than 5% over.</Note>
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </FinPage>
    )
}
