"use client"

import { BarsChart, Donut } from "@/components/charts/charts"
import { Heatmap } from "@/components/insights/heatmap"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Avatar } from "@/components/ui/avatar"
import { Empty, Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { dateOf, DAYS } from "@/lib/calendar"
import { dateLabel, fmt, pct, shortDate } from "@/lib/format"
import { ATT_LABEL, statusOf } from "@/lib/status"
import { AlarmClock, CalendarCheck, Clock, HeartPulse, Plane, UserX } from "lucide-react"
import Link from "next/link"
import { HrPage } from "../../components/hr-page"
import { StaffWeekly, staffItem } from "../../components/widgets"
import { LEAVE_COLOR, LEAVE_TYPES, locationOf } from "../../data/constants"

// late share of staff: under 3% is healthy, 3–5% worth watching, 5%+ a problem day
const lateColor = (v: number) =>
    v < 3
        ? `color-mix(in srgb, var(--good) ${Math.round(50 + (3 - v) * 15)}%, #ffffff)`
        : v < 5
          ? "color-mix(in srgb, var(--warn) 88%, #ffffff)"
          : "color-mix(in srgb, var(--bad) 88%, #ffffff)"

export function HrAttendanceScreen() {
    return (
        <HrPage title="Attendance & Leave" description="Staff presence, punctuality, and how leave is being used.">
            {({ a }) => {
                const t = a.totals
                const attTone = statusOf(a.att)
                const leaveTot = a.leaveYtd.reduce((s, x) => s + x.v, 0)
                const pending = a.list
                    .flatMap((e) => e.leave.filter((r) => r.status === "Pending").map((r) => ({ e, r })))
                    .sort((x, y) => x.r.from.getTime() - y.r.from.getTime())
                const absentees = [...a.list]
                    .filter((e) => e.m.sick + e.m.emergency + e.m.unauth > 0)
                    .sort((x, y) => y.m.sick + y.m.emergency + y.m.unauth - (x.m.sick + x.m.emergency + x.m.unauth))
                    .slice(0, 6)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Attendance"
                                icon={<CalendarCheck />}
                                color={`var(--${attTone})`}
                                value={pct(a.att)}
                                foot={<Pill tone={attTone}>{ATT_LABEL[attTone]}</Pill>}
                            />
                            <Kpi
                                label="Late arrivals"
                                icon={<Clock />}
                                color="var(--warn)"
                                value={pct(a.late)}
                                foot={<span>{fmt(t.L)} late days</span>}
                            />
                            <Kpi
                                label="Avg minutes late"
                                icon={<AlarmClock />}
                                color="var(--warn)"
                                value={a.lateMinsAvg.toFixed(0)}
                                foot={<span>per late arrival</span>}
                            />
                            <Kpi
                                label="Sick leave"
                                icon={<HeartPulse />}
                                color="var(--c4)"
                                value={fmt(t.S)}
                                foot={<span>days · {fmt(t.E)} emergency</span>}
                            />
                            <Kpi
                                label="Annual leave"
                                icon={<Plane />}
                                color="var(--c1)"
                                value={fmt(t.A)}
                                foot={<span>days taken in term</span>}
                            />
                            <Kpi
                                label="Unauthorised"
                                icon={<UserX />}
                                color="var(--bad)"
                                value={fmt(t.U)}
                                foot={<span>days without approval</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel span={8} title="Weekly staff attendance">
                                <StaffWeekly a={a} />
                            </Panel>
                            <Panel span={4} title="Lateness heatmap" subtitle="Share of staff arriving late, by day and week">
                                <Heatmap
                                    rows={DAYS}
                                    cols={a.weeks.map((w) => {
                                        const d = dateOf(w.w, 0)
                                        return `${d.getDate()}/${d.getMonth() + 1}`
                                    })}
                                    values={a.lateHeat}
                                    color={lateColor}
                                    format={(v) => v.toFixed(1)}
                                    tip={(ri, ci, v) => `${dateLabel(dateOf(a.weeks[ci].w, ri))}\n${pct(v)} of staff late`}
                                />
                            </Panel>
                            <Panel
                                span={8}
                                title="Leave by type and month"
                                subtitle="Leave days taken, January to October 2026"
                                action={<Legend items={LEAVE_TYPES.map((l) => ({ label: l, color: LEAVE_COLOR[l] }))} />}
                            >
                                <BarsChart
                                    data={a.leaveByMonth}
                                    xKey="month"
                                    series={LEAVE_TYPES.map((l) => ({ key: l, label: l, color: LEAVE_COLOR[l] }))}
                                    stacked
                                    valueFormat={(v) => `${fmt(v)} days`}
                                />
                            </Panel>
                            <Panel span={4} title="Leave mix, year to date">
                                <Donut
                                    height={200}
                                    data={a.leaveYtd.map((l) => ({ name: l.name, v: l.v, color: LEAVE_COLOR[l.name] }))}
                                    center={{ value: fmt(leaveTot), label: "days" }}
                                    format={(v, tt) => `${fmt(v)} days · ${pct(tt ? (v / tt) * 100 : 0)}`}
                                />
                                <Legend
                                    className="mt-4 justify-center"
                                    items={a.leaveYtd.map((l) => ({
                                        label: `${l.name} ${pct(leaveTot ? (l.v / leaveTot) * 100 : 0, 0)}`,
                                        color: LEAVE_COLOR[l.name],
                                    }))}
                                />
                            </Panel>
                            <Panel span={4} title="Annual leave balance" subtitle="Share of entitlement still available">
                                <BarsChart
                                    height={240}
                                    data={["> 75%", "50–75%", "25–50%", "< 25%"].map((label, i) => ({
                                        label,
                                        v: a.balanceBands[i],
                                        c: ["var(--good)", "#5cc394", "var(--warn)", "var(--bad)"][i],
                                    }))}
                                    series={[{ key: "v", label: "Staff", color: "var(--good)" }]}
                                    colorOf={(r) => String(r.c)}
                                    valueFormat={(v) => `${fmt(v)} staff`}
                                />
                            </Panel>
                            <Panel span={4} title="Most days absent" subtitle="Sick, emergency and unauthorised days in the period">
                                <Leaderboard
                                    items={absentees.map((e) => staffItem(e, `${e.m.sick + e.m.emergency + e.m.unauth} d`, "neg"))}
                                    empty="No absences in this period."
                                />
                            </Panel>
                            <Panel
                                span={4}
                                title="Pending leave requests"
                                subtitle={`${pending.length} awaiting approval`}
                                bodyClassName="max-h-[300px] overflow-y-auto pr-1"
                            >
                                {pending.length === 0 ? (
                                    <Empty>No pending requests.</Empty>
                                ) : (
                                    <ul className="space-y-1">
                                        {pending.map(({ e, r }, i) => (
                                            <li key={i}>
                                                <Link
                                                    href={`/hr/staff/${e.id}`}
                                                    className="hover:bg-primary-softer flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                                                >
                                                    <Avatar name={e.name} seed={e.id} size="sm" />
                                                    <span className="min-w-0 flex-1">
                                                        <b className="text-ink block truncate text-[13px] font-semibold">{e.name}</b>
                                                        <span className="text-muted block truncate text-[11.5px]">
                                                            {r.type} · from {shortDate(r.from)} · {locationOf(e.location).short}
                                                        </span>
                                                    </span>
                                                    <Pill tone="warn">{r.days} d</Pill>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </HrPage>
    )
}
