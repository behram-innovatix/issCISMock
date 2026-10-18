"use client"

import { BarsChart } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Meter } from "@/components/ui/meter"
import { Grid, Note, Panel } from "@/components/ui/panel"
import { compact, fmt, money, pct, qar, shortDate } from "@/lib/format"
import { locationOf } from "@/platforms/hr/data/constants"
import { Banknote, GraduationCap, Percent, School, UserRound, Users } from "lucide-react"
import { FinPage } from "../../components/fin-page"
import { FIN_MONTHS, GRADE_LABEL, LAST_CLOSED } from "../../data/constants"

const PARTS = [
    { key: "basic", label: "Basic salary", color: "var(--c1)" },
    { key: "housing", label: "Housing", color: "var(--c2)" },
    { key: "allowances", label: "Transport allowance", color: "var(--c5)" },
    { key: "eosb", label: "End-of-service accrual", color: "var(--c3)" },
]

export function FinPayrollScreen() {
    const month = FIN_MONTHS[LAST_CLOSED]
    return (
        <FinPage title="Payroll" description="Staff cost from HR records: packages by grade, joining dates and unpaid leave.">
            {({ a, f }) => {
                const p = a.payroll
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label={`${month} payroll cost`}
                                icon={<Banknote />}
                                color="var(--c1)"
                                value={qar(p.last)}
                                foot={<span>last closed month, incl. gratuity accrual</span>}
                            />
                            <Kpi
                                label="Payroll in period"
                                icon={<Banknote />}
                                color="var(--c2)"
                                value={qar(p.period)}
                                foot={<span>{fmt(p.headcount)} staff on payroll</span>}
                            />
                            <Kpi
                                label="Average cost per staff"
                                icon={<UserRound />}
                                color="var(--c3)"
                                value={qar(p.perFte)}
                                foot={<span>per month</span>}
                            />
                            <Kpi
                                label="Payroll ÷ income"
                                icon={<Percent />}
                                color={p.pctOfIncome < 60 ? "var(--good)" : "var(--warn)"}
                                value={f.location === "HQ" ? "–" : pct(p.pctOfIncome)}
                                foot={<span>{f.location === "HQ" ? "cost centre" : "of cash income in the period"}</span>}
                            />
                            <Kpi
                                label="Staff cost per student"
                                icon={<School />}
                                color="var(--c6)"
                                value={p.perStudent ? qar(p.perStudent) : "–"}
                                foot={<span>a year, at the {month} run-rate</span>}
                            />
                            <Kpi
                                label="Teaching share"
                                icon={<GraduationCap />}
                                color="var(--c4)"
                                value={pct(p.teachingShare)}
                                foot={<span>{qar(p.teachingCost)} a month</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Monthly payroll cost"
                                subtitle="New staff join in August; October is month to date"
                                action={<Legend items={PARTS.map((x) => ({ label: x.label, color: x.color }))} />}
                            >
                                <BarsChart height={280} data={p.monthly} stacked series={PARTS} yFormat={compact} valueFormat={qar} />
                            </Panel>
                            <Panel span={4} title="New joiners this year" subtitle={`Monthly cost in ${month}`}>
                                <Leaderboard
                                    items={p.newHires.slice(0, 6).map(({ p: r, cost }) => ({
                                        id: r.id,
                                        name: r.name,
                                        meta: `${r.role} · ${locationOf(r.location).short} · joined ${shortDate(r.hireDate)}`,
                                        value: qar(cost),
                                        href: `/hr/staff/${r.id}`,
                                    }))}
                                    empty="No staff joined this year."
                                />
                                {p.newHires.length > 6 && (
                                    <Note className="mt-2">
                                        {p.newHires.length} joiners in all, adding {qar(p.newHires.reduce((s, x) => s + x.cost, 0))} a
                                        month.
                                    </Note>
                                )}
                            </Panel>
                            <Panel span={7} title="Cost by department" subtitle={`${month} payroll cost, highest first`}>
                                <BarsChart
                                    height={Math.max(260, p.byDept.length * 28)}
                                    data={[...p.byDept].sort((x, y) => y.cost - x.cost)}
                                    series={[{ key: "cost", label: "Monthly cost", color: "var(--c1)" }]}
                                    horizontal
                                    categoryWidth={170}
                                    yFormat={compact}
                                    valueFormat={qar}
                                />
                            </Panel>
                            <Panel span={5} title="By grade" subtitle="Headcount and average monthly package">
                                <div className="-mx-1 overflow-x-auto px-1">
                                    <table className="w-full min-w-[380px] border-separate border-spacing-y-1 text-[13px]">
                                        <thead>
                                            <tr className="text-muted text-[10.5px] font-bold tracking-[.12em] uppercase">
                                                <th className="px-3 pb-1.5 text-left">Grade</th>
                                                <th className="px-3 pb-1.5 text-right">Staff</th>
                                                <th className="px-3 pb-1.5 text-right">Avg package</th>
                                                <th className="px-3 pb-1.5 text-right">Monthly cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {p.byGrade.map((g) => (
                                                <tr key={g.grade}>
                                                    <td className="bg-surface-2 rounded-l-xl px-3 py-2">
                                                        <b className="text-ink font-semibold">{g.grade}</b>{" "}
                                                        <span className="text-muted text-[11.5px]">{GRADE_LABEL[g.grade[0]]}</span>
                                                    </td>
                                                    <td className="tabular bg-surface-2 text-ink-2 px-3 py-2 text-right">{fmt(g.n)}</td>
                                                    <td className="tabular bg-surface-2 text-ink-2 px-3 py-2 text-right">{money(g.pkg)}</td>
                                                    <td className="tabular bg-surface-2 text-ink rounded-r-xl px-3 py-2 text-right font-semibold">
                                                        {qar(g.cost)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Panel>
                            <Panel span={12} title="By location" subtitle={`${month} payroll and annualised staff cost per student`}>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {p.byLocation.map((l) => (
                                        <div key={l.key} className="border-line bg-surface-2 rounded-xl border p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <b className="text-ink truncate text-[13px] font-semibold">{l.label}</b>
                                                <span className="text-muted flex items-center gap-1 text-[11.5px]">
                                                    <Users className="size-3" /> {fmt(l.n)} staff
                                                </span>
                                            </div>
                                            <div className="tabular font-display text-ink mt-3 text-[20px] font-semibold">
                                                {qar(l.cost)}
                                            </div>
                                            <Meter value={p.last ? (l.cost / p.last) * 100 : 0} color="var(--c1)" className="mt-1.5" />
                                            <div className="text-muted mt-2 flex justify-between text-[11.5px]">
                                                <span>{qar(l.avg)} avg / staff</span>
                                                <span>{l.students ? `${qar(l.perStudent)} / student` : "Cost centre"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </FinPage>
    )
}
