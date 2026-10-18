"use client"

import { BarsChart, Donut } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Tip } from "@/components/ui/tip"
import { cn } from "@/lib/cn"
import { compact, fmt, money, pct, qar } from "@/lib/format"
import { STAGES } from "@/platforms/edu/data/constants"
import { AlertTriangle, BadgePercent, CircleDollarSign, HandCoins, Hourglass, Receipt } from "lucide-react"
import { FinPage } from "../../components/fin-page"
import { AgeingBars, CollectionCurve, collectionTone } from "../../components/widgets"
import { CURRENT_TERM, METHOD_COLOR } from "../../data/constants"

const TONE_CELL = {
    good: "bg-good-soft text-good-ink",
    warn: "bg-warn-soft text-warn-ink",
    bad: "bg-bad-soft text-bad-ink",
} as const

export function FinFeesScreen() {
    return (
        <FinPage title="Fees & Collections" description="What families have been billed, what has been collected and what is still owed.">
            {({ a, f }) => {
                if (f.location === "HQ") return <Empty>The head office has no fee accounts. Choose a school or All locations.</Empty>
                const fe = a.fees
                const t = collectionTone(fe.rate)
                const curT = collectionTone(fe.currentCollected)
                const methodTotal = fe.methods.reduce((s, m) => s + m.v, 0)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Fees billed"
                                icon={<Receipt />}
                                color="var(--c1)"
                                value={qar(fe.billed)}
                                foot={<span>{qar(fe.discount)} in discounts</span>}
                            />
                            <Kpi
                                label="Collected"
                                icon={<HandCoins />}
                                color={`var(--${t})`}
                                value={qar(fe.collected)}
                                foot={<Pill tone={t}>{pct(fe.rate)} collected</Pill>}
                            />
                            <Kpi
                                label="Outstanding"
                                icon={<CircleDollarSign />}
                                color="var(--warn)"
                                value={qar(fe.outstanding)}
                                foot={<span>{qar(fe.overdue)} past due</span>}
                            />
                            <Kpi
                                label="Over 90 days"
                                icon={<Hourglass />}
                                color="var(--bad)"
                                value={qar(fe.over90)}
                                foot={<span>prior-term balances</span>}
                            />
                            <Kpi
                                label="Accounts in arrears"
                                icon={<AlertTriangle />}
                                color="var(--bad)"
                                value={fmt(fe.arrears)}
                                foot={
                                    <Pill tone={fe.arrears / (fe.n || 1) < 0.05 ? "good" : fe.arrears / (fe.n || 1) < 0.1 ? "warn" : "bad"}>
                                        {pct(fe.n ? (fe.arrears / fe.n) * 100 : 0)} of accounts
                                    </Pill>
                                }
                            />
                            <Kpi
                                label="Discounted accounts"
                                icon={<BadgePercent />}
                                color="var(--auth)"
                                value={fmt(fe.discounted)}
                                foot={<span>{pct(fe.gross ? (fe.discount / fe.gross) * 100 : 0)} of gross fees</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title={`${CURRENT_TERM.label} collection`}
                                subtitle={`Share of the term's ${qar(fe.currentBilled)} collected by each school week`}
                                action={
                                    <Legend
                                        items={[
                                            { label: "Collected", color: "var(--c1)" },
                                            { label: "Target", color: "var(--good)", dashed: true },
                                        ]}
                                    />
                                }
                            >
                                <CollectionCurve a={a} />
                                <Note className="mt-2">
                                    Returning families were billed with re-enrolment on 1 July (due 1 August); new joiners on admission (due
                                    15 September). <b className={`text-${curT}-ink`}>{pct(fe.currentCollected)}</b> collected to date.
                                </Note>
                            </Panel>
                            <Panel span={4} title="Ageing of balances" subtitle="Open balance by days past due">
                                <AgeingBars a={a} />
                                <ul className="mt-3 space-y-1.5 text-[12px]">
                                    {fe.ageing.map((b) => (
                                        <li key={b.label} className="flex justify-between gap-2">
                                            <span className="text-ink-2">{b.label}</span>
                                            <span className="tabular text-muted">
                                                <b className="text-ink font-semibold">{money(b.v)}</b> · {fmt(b.n)} accounts
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                            <Panel span={6} title="Collection rate by school and stage" subtitle="Collected ÷ billed for the period">
                                <div className="grid grid-cols-[minmax(92px,0.9fr)_repeat(3,minmax(0,1fr))] gap-2">
                                    <div />
                                    {STAGES.map((s) => (
                                        <div key={s} className="text-ink-2 pb-1 text-center text-[12px] font-semibold">
                                            {s}
                                        </div>
                                    ))}
                                    {fe.schoolStage.map((r) => (
                                        <div key={r.key} className="contents">
                                            <div className="text-ink flex items-center text-[12.5px] font-semibold">{r.label}</div>
                                            {r.cells.map((c, i) => {
                                                const tone = collectionTone(c.rate)
                                                return (
                                                    <Tip
                                                        key={STAGES[i]}
                                                        content={`${qar(c.collected)} of ${qar(c.billed)} · ${fmt(c.n)} accounts · ${c.arrears} in arrears`}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "flex min-h-[64px] flex-col items-center justify-center rounded-xl transition-transform duration-200 hover:-translate-y-0.5",
                                                                c.n ? TONE_CELL[tone] : "bg-bg-2 text-muted opacity-60",
                                                            )}
                                                        >
                                                            <b className="tabular font-display text-[18px] leading-none font-semibold">
                                                                {c.n ? pct(c.rate) : "–"}
                                                            </b>
                                                            <span className="mt-1 text-[11px] opacity-80">{qar(c.outstanding)} owed</span>
                                                        </div>
                                                    </Tip>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                            <Panel span={6} title="Collection by year group" subtitle="Sorted from lowest to highest">
                                <BarsChart
                                    height={Math.max(240, fe.byYg.length * 24)}
                                    data={[...fe.byYg].sort((x, y) => x.rate - y.rate)}
                                    series={[{ key: "rate", label: "Collected", color: "var(--c1)" }]}
                                    colorOf={(r) => `var(--${collectionTone(Number(r.rate))})`}
                                    horizontal
                                    categoryWidth={90}
                                    yDomain={[70, 100]}
                                    yFormat={(v) => `${v}%`}
                                    valueFormat={(v) => pct(v)}
                                    target={{ value: 95, label: "95%" }}
                                />
                            </Panel>
                            <Panel
                                span={6}
                                title="Discounts & scholarships"
                                subtitle="Tuition discounts granted on fees billed in the period"
                            >
                                <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
                                    <Donut
                                        height={190}
                                        data={fe.discounts.map((d) => ({ name: d.name, v: d.v, color: d.color }))}
                                        center={{ value: compact(fe.discount), label: "QAR discounts" }}
                                        format={(v, tot) => `${qar(v)} · ${pct(tot ? (v / tot) * 100 : 0)}`}
                                    />
                                    <ul className="space-y-2.5">
                                        {fe.discounts.map((d) => (
                                            <li key={d.name} className="flex items-center gap-2 text-[12.5px]">
                                                <i className="size-2.5 rounded-[3px]" style={{ background: d.color }} />
                                                <span className="text-ink-2 flex-1">{d.name}</span>
                                                <span className="tabular text-muted">{fmt(d.n)} students</span>
                                                <b className="tabular text-ink w-24 text-right font-semibold">{qar(d.v)}</b>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Panel>
                            <Panel span={6} title="How families pay" subtitle="Payments received in the period, by method">
                                <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
                                    <Donut
                                        height={190}
                                        data={fe.methods.map((m) => ({ name: m.name, v: m.v, color: METHOD_COLOR[m.name] }))}
                                        center={{ value: compact(methodTotal), label: "QAR received" }}
                                        format={(v, tot) => `${qar(v)} · ${pct(tot ? (v / tot) * 100 : 0)}`}
                                    />
                                    <ul className="space-y-2.5">
                                        {fe.methods.map((m) => (
                                            <li key={m.name} className="flex items-center gap-2 text-[12.5px]">
                                                <i className="size-2.5 rounded-[3px]" style={{ background: METHOD_COLOR[m.name] }} />
                                                <span className="text-ink-2 flex-1">{m.name}</span>
                                                <span className="tabular text-muted">
                                                    {pct(methodTotal ? (m.v / methodTotal) * 100 : 0)}
                                                </span>
                                                <b className="tabular text-ink w-24 text-right font-semibold">{qar(m.v)}</b>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </FinPage>
    )
}
