"use client"

import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { Meter } from "@/components/ui/meter"
import { Grid, Note, Panel } from "@/components/ui/panel"
import { fmt, pct, qar } from "@/lib/format"
import { Landmark, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react"
import { FinPage } from "../../components/fin-page"
import { CashCurve, CategoryBars, IncomeVsExpense, StreamBars } from "../../components/widgets"
import { BUDGET_CATEGORIES, REVENUE_STREAMS } from "../../data/constants"

export function FinCashFlowScreen() {
    return (
        <FinPage title="Revenue & Cash Flow" description="Money in, money out and the cash position it leaves the group with.">
            {({ a, f }) => {
                const group = f.location === "all"
                const flow = a.cash - a.cashStart
                const daysCash = a.dailySpend ? a.cash / a.dailySpend : 0
                const top = [...a.streams].sort((x, y) => y.v - x.v)[0]
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label={group ? "Cash position" : "Cumulative net cash"}
                                icon={<Landmark />}
                                color="var(--c2)"
                                value={qar(a.cash)}
                                foot={<span>{group ? `opening ${qar(a.cashStart)}` : "contribution since 1 Jan"}</span>}
                            />
                            <Kpi
                                label="Net cash flow"
                                icon={flow >= 0 ? <TrendingUp /> : <TrendingDown />}
                                color={flow >= 0 ? "var(--good)" : "var(--bad)"}
                                value={qar(flow)}
                                foot={
                                    <span>
                                        {qar(a.income)} in · {qar(a.expense)} out
                                    </span>
                                }
                            />
                            <Kpi
                                label="Days of cash on hand"
                                icon={<ShieldCheck />}
                                color={daysCash >= 90 ? "var(--good)" : daysCash >= 45 ? "var(--warn)" : "var(--bad)"}
                                value={group ? fmt(daysCash) : "–"}
                                foot={<span>{group ? `at ${qar(a.dailySpend)} a day` : "group-level measure"}</span>}
                            />
                            <Kpi
                                label="Largest income stream"
                                icon={<TrendingUp />}
                                color={top?.color}
                                value={top && a.income ? pct((top.v / a.income) * 100, 0) : "–"}
                                foot={<span>{top?.name}</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={7}
                                title="Monthly inflow vs outflow"
                                subtitle="Cash received and spent each month · October is month to date"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Income", color: "var(--c1)" },
                                            { label: "Expenditure", color: "var(--c4)" },
                                        ]}
                                    />
                                }
                            >
                                <IncomeVsExpense a={a} />
                            </Panel>
                            <Panel
                                span={5}
                                title={group ? "Cash position" : "Cumulative net cash"}
                                subtitle={group ? "Group cash at the end of each month" : "Running income less expenditure since 1 January"}
                            >
                                <CashCurve a={a} height={280} />
                            </Panel>
                            <Panel span={6} title="Income by stream" subtitle="Tuition dominates in billing months">
                                <StreamBars a={a} />
                                <Legend
                                    className="mt-3 justify-center"
                                    items={REVENUE_STREAMS.map((s) => ({ label: s.name, color: s.color }))}
                                />
                            </Panel>
                            <Panel
                                span={6}
                                title="Expenditure by category"
                                subtitle="Salaries are the steady base; resources and IT peak before the new year"
                            >
                                <CategoryBars a={a} />
                                <Legend
                                    className="mt-3 justify-center"
                                    items={BUDGET_CATEGORIES.map((c) => ({ label: c.name, color: c.color }))}
                                />
                            </Panel>
                            <Panel span={12} title="Income streams" subtitle="Total for the period and share of income">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    {a.streams.map((s) => (
                                        <div key={s.code} className="border-line bg-surface-2 rounded-xl border p-4">
                                            <div className="flex items-center gap-2">
                                                <i className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
                                                <b className="text-ink truncate text-[12.5px] font-semibold">{s.name}</b>
                                            </div>
                                            <div className="tabular font-display text-ink mt-2 text-[19px] font-semibold">{qar(s.v)}</div>
                                            <Meter value={a.income ? (s.v / a.income) * 100 : 0} color={s.color} className="mt-1.5" />
                                            <div className="text-muted mt-1 text-[11.5px]">
                                                {pct(a.income ? (s.v / a.income) * 100 : 0)} of income
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Note className="mt-3">
                                    Cash basis. Fee receipts are split across tuition, resources and transport in proportion to each
                                    invoice. October is month to date.
                                </Note>
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </FinPage>
    )
}
