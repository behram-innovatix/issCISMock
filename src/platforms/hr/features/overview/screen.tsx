"use client"

import { BarsChart } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Meter } from "@/components/ui/meter"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { fmt, pct, score } from "@/lib/format"
import { ATT_LABEL, statusOf } from "@/lib/status"
import { CalendarCheck, CalendarMinus, ShieldAlert, Star, Users } from "lucide-react"
import Link from "next/link"
import { CURRENT_CYCLE, ratingOf } from "../../data/constants"
import { HrPage } from "../../components/hr-page"
import { DayMix, RATING_TONE, ScoreDistribution, StaffWeekly, staffItem } from "../../components/widgets"

const CYCLE_COLOR = ["var(--good)", "var(--c1)", "var(--c2)", "var(--line-strong)"]

export function HrOverviewScreen() {
    return (
        <HrPage
            title="Workforce Performance"
            description="How staff are showing up and performing, across every school and the head office."
        >
            {({ a }) => {
                const attTone = statusOf(a.att)
                const rating = ratingOf(a.avgAppraisal)
                const attention = a.list
                    .filter((e) => e.m.status !== "good")
                    .sort((x, y) => (x.m.status === y.m.status ? x.m.att - y.m.att : x.m.status === "bad" ? -1 : 1))
                    .slice(0, 6)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Staff"
                                icon={<Users />}
                                color="var(--c2)"
                                value={fmt(a.n)}
                                foot={
                                    <span>
                                        {fmt(a.teaching)} teaching · {fmt(a.support)} support
                                    </span>
                                }
                            />
                            <Kpi
                                label="Staff attendance"
                                icon={<CalendarCheck />}
                                color={`var(--${attTone})`}
                                value={pct(a.att)}
                                foot={
                                    <>
                                        <Pill tone={attTone}>{ATT_LABEL[attTone]}</Pill>
                                        <span>target 95%</span>
                                    </>
                                }
                            />
                            <Kpi
                                label="Absence rate"
                                icon={<CalendarMinus />}
                                color="var(--bad)"
                                value={pct(a.absence)}
                                foot={<span>sick, emergency & unauthorised</span>}
                            />
                            <Kpi
                                label="Leave days taken"
                                icon={<CalendarMinus />}
                                color="var(--auth)"
                                value={fmt(a.leaveDays)}
                                foot={
                                    <span>
                                        {fmt(a.totals.S)} sick · {fmt(a.totals.A)} annual
                                    </span>
                                }
                            />
                            <Kpi
                                label="Average appraisal"
                                icon={<Star />}
                                color="var(--c1)"
                                value={
                                    <>
                                        {score(a.avgAppraisal)}
                                        <span className="text-muted ml-1 text-[13px] font-medium">/ 5</span>
                                    </>
                                }
                                foot={<Pill tone={RATING_TONE[rating]}>{rating}</Pill>}
                            />
                            <Kpi
                                label="Staff at risk"
                                icon={<ShieldAlert />}
                                color="var(--bad)"
                                value={fmt(a.atRisk)}
                                foot={
                                    <Pill tone={a.atRisk / (a.n || 1) < 0.05 ? "good" : a.atRisk / (a.n || 1) < 0.1 ? "warn" : "bad"}>
                                        {pct(a.n ? (a.atRisk / a.n) * 100 : 0)} of staff
                                    </Pill>
                                }
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Weekly staff attendance"
                                subtitle="Days present or late, excluding approved annual leave"
                            >
                                <StaffWeekly a={a} />
                            </Panel>
                            <Panel span={4} title="Working-day mix" subtitle="Every staff working day in the period">
                                <DayMix a={a} />
                            </Panel>
                            <Panel span={5} title="Appraisal score distribution" subtitle="Latest completed appraisal per staff member">
                                <ScoreDistribution a={a} />
                            </Panel>
                            <Panel span={3} title={`${CURRENT_CYCLE.label} cycle`} subtitle="Progress of the current appraisal round">
                                <div className="flex items-end gap-2">
                                    <b className="tabular font-display text-ink text-[30px] leading-none font-semibold">
                                        {pct(a.completion, 0)}
                                    </b>
                                    <span className="text-muted pb-1 text-[12px]">completed</span>
                                </div>
                                <div className="bg-bg-2 mt-3 flex h-2.5 overflow-hidden rounded-full">
                                    {a.cycleStatus.map((s, i) => (
                                        <i
                                            key={s.name}
                                            className="block h-full transition-[width] duration-700"
                                            style={{
                                                width: `${(s.v / (a.cycleStatus.reduce((t, x) => t + x.v, 0) || 1)) * 100}%`,
                                                background: CYCLE_COLOR[i],
                                            }}
                                        />
                                    ))}
                                </div>
                                <ul className="mt-4 space-y-2.5">
                                    {a.cycleStatus.map((s, i) => (
                                        <li key={s.name} className="flex items-center gap-2 text-[12.5px]">
                                            <i className="size-2.5 rounded-[3px]" style={{ background: CYCLE_COLOR[i] }} />
                                            <span className="text-ink-2 flex-1">{s.name}</span>
                                            <b className="tabular text-ink font-semibold">{fmt(s.v)}</b>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                            <Panel
                                span={4}
                                title="Needs attention"
                                subtitle="At-risk and watch-list staff"
                                action={
                                    <Link href="/hr/staff" className="text-primary text-[12px] font-semibold hover:underline">
                                        View all
                                    </Link>
                                }
                            >
                                <Leaderboard
                                    items={attention.map((e) => staffItem(e, pct(e.m.att), e.m.status === "bad" ? "neg" : "neutral"))}
                                    empty="Everyone is on track."
                                />
                            </Panel>
                            <Panel
                                span={12}
                                title="By location"
                                subtitle="Attendance and average appraisal for each school and the head office"
                            >
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {a.byLocation.map((l) => {
                                        const t = statusOf(l.att)
                                        return (
                                            <div key={l.key} className="border-line bg-surface-2 rounded-xl border p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <b className="text-ink truncate text-[13px] font-semibold">{l.label}</b>
                                                    <span className="text-muted text-[11.5px]">{fmt(l.n)} staff</span>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="eyebrow">Attendance</div>
                                                        <div className="tabular font-display text-ink mt-0.5 text-[18px] font-semibold">
                                                            {pct(l.att)}
                                                        </div>
                                                        <Meter value={(l.att - 80) * 5} color={`var(--${t})`} className="mt-1.5" />
                                                    </div>
                                                    <div>
                                                        <div className="eyebrow">Appraisal</div>
                                                        <div className="tabular font-display text-ink mt-0.5 text-[18px] font-semibold">
                                                            {score(l.appraisal)}
                                                        </div>
                                                        <Meter value={((l.appraisal - 1) / 4) * 100} color="var(--c1)" className="mt-1.5" />
                                                    </div>
                                                </div>
                                                {l.atRisk > 0 && (
                                                    <Pill tone="bad" className="mt-3">
                                                        {l.atRisk} at risk
                                                    </Pill>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </Panel>
                            <Panel span={12} title="Attendance by department" subtitle="Sorted from lowest to highest">
                                <BarsChart
                                    height={Math.max(220, a.byDept.length * 30)}
                                    data={[...a.byDept].sort((x, y) => x.att - y.att)}
                                    series={[{ key: "att", label: "Attendance", color: "var(--good)" }]}
                                    colorOf={(r) => `var(--${statusOf(Number(r.att))})`}
                                    horizontal
                                    categoryWidth={170}
                                    yDomain={[80, 100]}
                                    yFormat={(v) => `${v}%`}
                                    valueFormat={(v) => pct(v)}
                                    target={{ value: 95, label: "95%" }}
                                />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </HrPage>
    )
}
