"use client"

import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Meter } from "@/components/ui/meter"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { money, pct, qar } from "@/lib/format"
import { ArrowDownRight, ArrowUpRight, PiggyBank, Receipt, Scale, Wallet } from "lucide-react"
import Link from "next/link"
import { FinPage } from "../../components/fin-page"
import { accountItem, BudgetVsActual, collectionTone, IncomeVsExpense, RevenueMix, signedPct, varianceTone } from "../../components/widgets"

export function FinOverviewScreen() {
    return (
        <FinPage
            title="Financial Performance"
            description="Income, spending, fee collection and budget health across every school and the head office."
        >
            {({ a, f }) => {
                const hq = f.location === "HQ"
                const colTone = collectionTone(a.fees.rate)
                const varTone = varianceTone(a.budget.varPct)
                const overdue = a.list
                    .filter((x) => x.m.overdue > 0)
                    .sort((x, y) => y.m.overdue - x.m.overdue)
                    .slice(0, 6)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Income"
                                icon={<ArrowDownRight />}
                                color="var(--c1)"
                                value={qar(a.income)}
                                foot={<span>cash received in the period</span>}
                            />
                            <Kpi
                                label="Expenditure"
                                icon={<ArrowUpRight />}
                                color="var(--c4)"
                                value={qar(a.expense)}
                                foot={<span>{pct(a.budget.used, 0)} of the annual budget used</span>}
                            />
                            <Kpi
                                label={hq ? "Net cost" : "Net surplus"}
                                icon={<Scale />}
                                color={a.net >= 0 ? "var(--good)" : "var(--bad)"}
                                value={qar(a.net)}
                                foot={
                                    hq ? (
                                        <span>head office is a cost centre</span>
                                    ) : (
                                        <Pill tone={a.net >= 0 ? "good" : "bad"}>{pct(a.margin)} margin</Pill>
                                    )
                                }
                            />
                            {!hq && (
                                <Kpi
                                    label="Fee collection"
                                    icon={<Receipt />}
                                    color={`var(--${colTone})`}
                                    value={pct(a.fees.rate)}
                                    foot={
                                        <>
                                            <Pill tone={colTone}>
                                                {colTone === "good" ? "On target" : colTone === "warn" ? "Watch" : "Below target"}
                                            </Pill>
                                            <span>target 95%</span>
                                        </>
                                    }
                                />
                            )}
                            {!hq && (
                                <Kpi
                                    label="Outstanding fees"
                                    icon={<Wallet />}
                                    color="var(--warn)"
                                    value={qar(a.fees.outstanding)}
                                    foot={<span>{qar(a.fees.overdue)} overdue</span>}
                                />
                            )}
                            <Kpi
                                label="Budget variance"
                                icon={<PiggyBank />}
                                color={`var(--${varTone})`}
                                value={signedPct(a.budget.varPct)}
                                foot={
                                    <span>
                                        {a.budget.variance > 0 ? `${qar(a.budget.variance)} over` : `${qar(-a.budget.variance)} under`}{" "}
                                        budget
                                    </span>
                                }
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Income vs expenditure"
                                subtitle="By month · fees are billed termly, so income arrives in January, April and July–September · October is month to date"
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
                            <Panel span={4} title="Where income comes from" subtitle="Cash received by stream">
                                <RevenueMix a={a} />
                            </Panel>
                            <Panel
                                span={7}
                                title="Budget vs actual"
                                subtitle="Spend by category against the phased budget for the period"
                                action={
                                    <Link href="/fin/budget" className="text-primary text-[12px] font-semibold hover:underline">
                                        Details
                                    </Link>
                                }
                            >
                                <BudgetVsActual a={a} />
                            </Panel>
                            <Panel span={5} title="Year-end outlook" subtitle="Spend projected at the current spend-to-budget ratio">
                                <div className="flex items-end gap-2">
                                    <b className="tabular font-display text-ink text-[28px] leading-none font-semibold">
                                        {qar(a.budget.forecast)}
                                    </b>
                                    <span className="text-muted pb-1 text-[12px]">forecast spend</span>
                                </div>
                                <ul className="mt-4 space-y-2.5 text-[12.5px]">
                                    {[
                                        ["Annual budget", qar(a.budget.annual)],
                                        [
                                            a.budget.forecast > a.budget.annual ? "Projected overspend" : "Projected saving",
                                            qar(Math.abs(a.budget.forecast - a.budget.annual)),
                                        ],
                                        ["Cash position today", qar(a.cash)],
                                        ["Lines over budget (> 5%)", String(a.overBudget.length)],
                                    ].map(([k, v]) => (
                                        <li key={k} className="flex items-center justify-between gap-2">
                                            <span className="text-ink-2">{k}</span>
                                            <b className="tabular text-ink font-semibold">{v}</b>
                                        </li>
                                    ))}
                                </ul>
                                <Note className="mt-4">
                                    Figures are cash basis, Jan – 8 Oct 2026. October is month to date; its budget is pro-rated to 8 days.
                                </Note>
                            </Panel>
                            <Panel span={6} title="Fee collection by school" subtitle="Collected against fees billed in the period">
                                {a.fees.byLocation.length ? (
                                    <ul className="space-y-4">
                                        {a.fees.byLocation.map((l) => {
                                            const t = collectionTone(l.rate)
                                            return (
                                                <li key={l.key}>
                                                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                                                        <b className="text-ink text-[13px] font-semibold">{l.label}</b>
                                                        <span className="tabular text-ink-2 text-[12px]">
                                                            {qar(l.collected)} of {qar(l.billed)} ·{" "}
                                                            <b className={`text-${t}-ink font-semibold`}>{pct(l.rate)}</b>
                                                        </span>
                                                    </div>
                                                    <Meter value={l.rate} color={`var(--${t})`} />
                                                    <div className="text-muted mt-1 text-[11.5px]">
                                                        {qar(l.outstanding)} outstanding · {l.arrears} accounts in arrears
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <Empty>The head office has no fee accounts.</Empty>
                                )}
                            </Panel>
                            <Panel
                                span={6}
                                title="Largest overdue balances"
                                subtitle="Fee accounts to chase first"
                                action={
                                    <Link href="/fin/accounts" className="text-primary text-[12px] font-semibold hover:underline">
                                        View all
                                    </Link>
                                }
                            >
                                <Leaderboard
                                    items={overdue.map((x) =>
                                        accountItem(x, money(x.m.overdue), x.m.status === "arrears" ? "neg" : "neutral"),
                                    )}
                                    empty="No overdue balances."
                                />
                            </Panel>
                            <Panel
                                span={12}
                                title="By location"
                                subtitle="Income, spend and budget position for each school and the head office"
                            >
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {a.budgetByLocation.map((l) => {
                                        const fee = a.fees.byLocation.find((x) => x.key === l.key)
                                        const vt = varianceTone(l.varPct)
                                        return (
                                            <div key={l.key} className="border-line bg-surface-2 rounded-xl border p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <b className="text-ink truncate text-[13px] font-semibold">{l.label}</b>
                                                    <Pill tone={vt}>{signedPct(l.varPct)} vs budget</Pill>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="eyebrow">Spend</div>
                                                        <div className="tabular font-display text-ink mt-0.5 text-[18px] font-semibold">
                                                            {qar(l.actual)}
                                                        </div>
                                                        <Meter value={l.used} color="var(--c4)" className="mt-1.5" />
                                                        <div className="text-muted mt-1 text-[11px]">{pct(l.used, 0)} of annual budget</div>
                                                    </div>
                                                    <div>
                                                        <div className="eyebrow">Fee collection</div>
                                                        <div className="tabular font-display text-ink mt-0.5 text-[18px] font-semibold">
                                                            {fee ? pct(fee.rate) : "–"}
                                                        </div>
                                                        {fee ? (
                                                            <>
                                                                <Meter
                                                                    value={fee.rate}
                                                                    color={`var(--${collectionTone(fee.rate)})`}
                                                                    className="mt-1.5"
                                                                />
                                                                <div className="text-muted mt-1 text-[11px]">
                                                                    {qar(fee.outstanding)} outstanding
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-muted mt-1.5 text-[11px]">Cost centre</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </FinPage>
    )
}
