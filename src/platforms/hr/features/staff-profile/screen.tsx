"use client"

import { BarsChart, RadarPlot } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { TermCalendar } from "@/components/insights/term-calendar"
import { Avatar } from "@/components/ui/avatar"
import { Meter } from "@/components/ui/meter"
import { Empty, Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { periodLong } from "@/lib/calendar"
import { avg, dateLabel, fmt, pct, score, shortDate } from "@/lib/format"
import { STATUS_LABEL, statusOf } from "@/lib/status"
import { sectionLabel, sectionOutcomes } from "@/platforms/edu/analytics"
import { useEduData } from "@/platforms/edu/hooks"
import { useEdu } from "@/platforms/edu/state"
import { ArrowLeft, CalendarCheck, CalendarMinus, Clock, Gauge, Plane, Star } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { hrMetricsFor } from "../../analytics"
import { RATING_TONE, scoreColor, staffMeta } from "../../components/widgets"
import { COMPETENCIES, DAYCAT_COLOR, DAYCAT_LABEL, deptOf, HR_CAT, HR_CODES, LEAVE_COLOR, locationOf } from "../../data/constants"
import { useHrData } from "../../hooks"
import { useHr } from "../../state"

const tenure = (d: Date) => {
    const months = (2026 - d.getFullYear()) * 12 + (9 - d.getMonth())
    return months < 12 ? `${Math.max(months, 1)} mo` : `${(months / 12).toFixed(1)} yrs`
}

export function StaffProfileScreen({ id }: { id: string }) {
    const router = useRouter()
    const { data } = useHrData()
    const { data: edu } = useEduData()
    const w0 = useHr((s) => s.filters.w0)
    if (!data || !edu) return <ScreenSkeleton />
    const e = data.employees.find((x) => x.id === id)
    if (!e)
        return (
            <Empty>
                Staff member not found.{" "}
                <Link href="/hr/staff" className="text-primary ml-1 font-semibold">
                    Back to staff
                </Link>
            </Empty>
        )

    const m = hrMetricsFor(e, w0)
    const manager = data.employees.find((x) => x.id === e.managerId)
    const reports = data.employees.filter((x) => x.managerId === e.id).map((x) => ({ ...x, m: hrMetricsFor(x, w0) }))
    const peers = data.employees.filter((x) => x.dept === e.dept && x.id !== e.id)
    const latest = [...e.appraisals].reverse().find((a) => a.scores)
    const peerScores = peers.map((p) => [...p.appraisals].reverse().find((a) => a.scores)?.scores).filter(Boolean) as number[][]
    const radar = COMPETENCIES.map((name, i) => ({ name, me: latest?.scores?.[i] ?? 0, dept: avg(peerScores.map((s) => s[i])) }))
    const attTone = statusOf(m.att)
    const leaveTaken = m.leaveYtd.reduce((s, x) => s + x, 0)
    const sections = e.sections.map((k) => edu.sections.find((x) => x.key === k)!).filter(Boolean)
    const recorded = edu.students.flatMap((s) => s.ev.filter((ev) => ev.byStaffId === e.id && ev.w >= w0))

    const openSection = (key: string) => {
        const x = edu.sections.find((s) => s.key === key)!
        const st = useEdu.getState()
        st.reset()
        st.setSchool(x.school)
        st.setYg(x.yg)
        st.setSec(x.sec)
        router.push("/edu/students")
    }

    return (
        <div className="space-y-4">
            <Link
                href="/hr/staff"
                className="animate-fade text-muted hover:text-primary inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
            >
                <ArrowLeft className="size-4" /> Back to staff
            </Link>
            <section className="animate-rise border-line bg-surface shadow-card flex flex-wrap items-center gap-4 rounded-2xl border p-5">
                <Avatar name={e.name} seed={e.id} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-ink text-[24px] leading-tight font-semibold">{e.name}</h1>
                        <Pill tone={m.status} dot>
                            {STATUS_LABEL[m.status]}
                        </Pill>
                    </div>
                    <div className="text-ink-2 mt-0.5 text-[13px]">
                        {e.role} · {deptOf(e.dept).name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                            locationOf(e.location).name,
                            `Grade ${e.grade}`,
                            `Joined ${shortDate(e.hireDate)} · ${tenure(e.hireDate)}`,
                            e.nat,
                        ].map((c) => (
                            <Pill key={c}>{c}</Pill>
                        ))}
                        {manager && (
                            <Link href={`/hr/staff/${manager.id}`}>
                                <Pill tone="info" className="hover:bg-primary/15 transition-colors">
                                    Reports to {manager.name}
                                </Pill>
                            </Link>
                        )}
                    </div>
                </div>
                <div className="text-muted text-right text-[11.5px]">{periodLong(w0)}</div>
            </section>

            <KpiGrid>
                <Kpi
                    label="Attendance"
                    icon={<CalendarCheck />}
                    color={`var(--${attTone})`}
                    value={pct(m.att)}
                    foot={<span>{m.tot} working days</span>}
                />
                <Kpi
                    label="Late days"
                    icon={<Clock />}
                    color="var(--warn)"
                    value={fmt(m.late)}
                    foot={<span>{m.late ? `${Math.round(m.lateMins / m.late)} min average` : "always on time"}</span>}
                />
                <Kpi
                    label="Absent days"
                    icon={<CalendarMinus />}
                    color="var(--bad)"
                    value={fmt(m.sick + m.emergency + m.unauth)}
                    foot={
                        <span>
                            {m.sick} sick · {m.unauth} unauthorised
                        </span>
                    }
                />
                <Kpi
                    label="Leave taken (YTD)"
                    icon={<Plane />}
                    color="var(--auth)"
                    value={fmt(leaveTaken)}
                    foot={<span>days since January</span>}
                />
                <Kpi
                    label="Latest appraisal"
                    icon={<Star />}
                    color={scoreColor(m.appraisal)}
                    value={m.appraisal == null ? "–" : score(m.appraisal)}
                    foot={m.rating ? <Pill tone={RATING_TONE[m.rating]}>{m.rating}</Pill> : <span>No completed cycle yet</span>}
                />
                <Kpi
                    label="KPI attainment"
                    icon={<Gauge />}
                    color="var(--c3)"
                    value={pct(m.kpi, 0)}
                    foot={<Meter value={m.kpi} color="var(--c3)" className="flex-1" />}
                />
            </KpiGrid>

            <Grid>
                <Panel
                    span={8}
                    title="Attendance calendar"
                    subtitle="One mark per working day"
                    action={
                        <Legend
                            items={(["present", "late", "leave", "absent"] as const).map((c) => ({
                                label: DAYCAT_LABEL[c],
                                color: DAYCAT_COLOR[c],
                            }))}
                        />
                    }
                >
                    <TermCalendar
                        cell={(w, d, dt) => {
                            const i = w * 5 + d
                            const code = e.days[i]
                            return {
                                parts: [DAYCAT_COLOR[HR_CAT[code]]],
                                tip: `${dateLabel(dt)}\n${HR_CODES[code][1]}${e.lateMins[i] ? ` · ${e.lateMins[i]} min` : ""}`,
                            }
                        }}
                    />
                </Panel>
                <Panel span={4} title="Leave" subtitle="Balances and requests">
                    <div className="space-y-3">
                        {(["Annual", "Sick"] as const).map((t, i) => {
                            const used = m.leaveYtd[i === 0 ? 0 : 1]
                            const ent = e.entitlement[t]
                            return (
                                <div key={t}>
                                    <div className="mb-1 flex justify-between text-[12px]">
                                        <span className="text-ink font-semibold">{t} leave</span>
                                        <span className="tabular text-muted">
                                            {used} of {ent} days used · <b className="text-ink-2">{Math.max(ent - used, 0)} left</b>
                                        </span>
                                    </div>
                                    <Meter value={(used / ent) * 100} color={LEAVE_COLOR[t]} />
                                </div>
                            )
                        })}
                    </div>
                    <div className="eyebrow mt-5 mb-2">Requests</div>
                    {e.leave.length === 0 ? (
                        <Empty>No leave requests this year.</Empty>
                    ) : (
                        <ul className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                            {e.leave.map((r, i) => (
                                <li key={i} className="bg-surface-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px]">
                                    <i className="size-2 rounded-full" style={{ background: LEAVE_COLOR[r.type] }} />
                                    <span className="min-w-0 flex-1">
                                        <b className="text-ink font-semibold">{r.type}</b>
                                        <span className="text-muted">
                                            {" "}
                                            · {shortDate(r.from)} · {r.days} {r.days === 1 ? "day" : "days"}
                                        </span>
                                    </span>
                                    <Pill tone={r.status === "Approved" ? "good" : r.status === "Pending" ? "warn" : "bad"}>
                                        {r.status}
                                    </Pill>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel span={4} title="Appraisal history" subtitle="Overall score by cycle">
                    {e.appraisals.length === 0 ? (
                        <Empty>Not yet eligible for an appraisal.</Empty>
                    ) : (
                        <>
                            <BarsChart
                                height={200}
                                data={e.appraisals.map((a) => ({
                                    label: a.label.replace(" Annual", ""),
                                    v: a.overall ?? 0,
                                    status: a.status,
                                }))}
                                series={[{ key: "v", label: "Overall", color: "var(--c1)" }]}
                                colorOf={(r) => scoreColor(Number(r.v) || undefined)}
                                yDomain={[0, 5]}
                                yFormat={(v) => v.toFixed(1)}
                                valueFormat={(v) => (v ? score(v) : "Pending")}
                            />
                            <ul className="mt-3 space-y-1.5">
                                {e.appraisals.map((a) => (
                                    <li key={a.cycle} className="flex items-center justify-between text-[12.5px]">
                                        <span className="text-ink-2">{a.label}</span>
                                        <Pill tone={a.status === "Completed" ? "good" : a.status === "Not started" ? "neutral" : "warn"}>
                                            {a.status}
                                        </Pill>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </Panel>
                <Panel
                    span={4}
                    title="Competencies"
                    subtitle={latest ? `${latest.label} vs department average` : "No scored appraisal yet"}
                    action={
                        <Legend
                            items={[
                                { label: "This person", color: "var(--primary)" },
                                { label: "Dept avg", color: "var(--muted)", dashed: true },
                            ]}
                        />
                    }
                >
                    {latest ? (
                        <RadarPlot
                            height={250}
                            data={radar}
                            series={[
                                { key: "me", label: "This person", color: "var(--primary)", fill: true },
                                { key: "dept", label: "Department average", color: "var(--muted)", dashed: true },
                            ]}
                        />
                    ) : (
                        <Empty>Scores appear after the first completed appraisal.</Empty>
                    )}
                </Panel>
                <Panel span={4} title="KPIs" subtitle="Target vs actual, year to date">
                    <ul className="space-y-4">
                        {e.kpis.map((k) => {
                            const tone = k.attainment >= 100 ? "good" : k.attainment >= 85 ? "warn" : "bad"
                            return (
                                <li key={k.name}>
                                    <div className="mb-1 flex items-start justify-between gap-2 text-[12.5px]">
                                        <span className="text-ink font-semibold">{k.name}</span>
                                        <Pill tone={tone}>{pct(k.attainment, 0)}</Pill>
                                    </div>
                                    <Meter value={Math.min(k.attainment, 100)} color={`var(--${tone})`} />
                                    <div className="tabular text-muted mt-1 text-[11.5px]">
                                        Actual {k.unit === "/5" ? k.actual.toFixed(1) : k.actual.toFixed(k.unit === "h" ? 0 : 1)}
                                        {k.unit} · target {k.target}
                                        {k.unit}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </Panel>

                {e.teaching && (
                    <Panel
                        span={reports.length ? 8 : 12}
                        title="Classes taught"
                        subtitle={`Linked from EDU · ${recorded.length} behaviour records logged by ${e.name.split(" ")[0]} ${e.name.split(" ").slice(-1)}`}
                    >
                        {sections.length === 0 ? (
                            <Empty>No classes on the timetable.</Empty>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {sections.map((x) => {
                                    const o = sectionOutcomes(edu, [x.key], w0)
                                    return (
                                        <button
                                            key={x.key}
                                            type="button"
                                            onClick={() => openSection(x.key)}
                                            className="group border-line bg-surface-2 hover:border-primary/30 hover:bg-primary-softer flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5"
                                        >
                                            <span className="bg-primary-soft font-display text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                                                {sectionLabel(x)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <b className="text-ink group-hover:text-primary block truncate text-[13px] font-semibold">
                                                    {sectionLabel(x, true)}
                                                    {e.formSection === x.key && (
                                                        <span className="text-primary ml-1.5 text-[11px] font-semibold">· Form tutor</span>
                                                    )}
                                                </b>
                                                <span className="text-muted block text-[11.5px]">
                                                    {o.students} students · {o.atRisk} at risk · net {o.netPerStudent >= 0 ? "+" : "−"}
                                                    {Math.abs(o.netPerStudent).toFixed(1)}/student
                                                </span>
                                            </span>
                                            <Pill tone={statusOf(o.att)}>{pct(o.att)}</Pill>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </Panel>
                )}
                {reports.length > 0 && (
                    <Panel
                        span={e.teaching ? 4 : 8}
                        title="Direct reports"
                        subtitle={`${reports.length} people`}
                        bodyClassName="max-h-[340px] overflow-y-auto pr-1"
                    >
                        <Leaderboard
                            items={reports
                                .sort((x, y) => x.m.att - y.m.att)
                                .map((r) => ({
                                    id: r.id,
                                    name: r.name,
                                    meta: staffMeta(r),
                                    value: pct(r.m.att),
                                    tone: r.m.status === "bad" ? "neg" : "neutral",
                                    href: `/hr/staff/${r.id}`,
                                }))}
                        />
                    </Panel>
                )}
            </Grid>
        </div>
    )
}
