"use client"

import { Donut, TrendChart } from "@/components/charts/charts"
import { Kpi, KpiGrid, Neg, Pos } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { NotConnected } from "@/components/insights/not-connected"
import { TermCalendar } from "@/components/insights/term-calendar"
import { Avatar } from "@/components/ui/avatar"
import { Empty, Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { dateOf, periodLong, WEEKS } from "@/lib/calendar"
import { dateLabel, fmt, pct, signed } from "@/lib/format"
import { STATUS_LABEL, statusOf } from "@/lib/status"
import { useEmployeeIndex } from "@/platforms/hr/hooks"
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, FileCheck2, FileX2, Sparkles } from "lucide-react"
import Link from "next/link"
import { metricsFor, sectionAverageWeeks, studentWeeks } from "../../analytics"
import { CodeRows, MIX } from "../../components/widgets"
import { BTYPES, CAT, CAT_COLOR, CAT_LABEL, CODES, schoolOf, secName, SPW, ygName } from "../../data/constants"
import { useEduData, useStaffIndex } from "../../hooks"
import { useEdu } from "../../state"

export function StudentProfileScreen({ id }: { id: string }) {
    const { data } = useEduData()
    const w0 = useEdu((s) => s.filters.w0)
    const staff = useStaffIndex()
    const employees = useEmployeeIndex()
    if (!data) return <ScreenSkeleton />
    if (!data.meta.connected) return <NotConnected name="EDU" meta={data.meta} />
    const st = data.students.find((s) => s.id === id)
    if (!st)
        return (
            <Empty>
                Student not found.{" "}
                <Link href="/edu/students" className="text-primary ml-1 font-semibold">
                    Back to register
                </Link>
            </Empty>
        )

    const m = metricsFor(st, w0)
    const section = data.sections.find((x) => x.key === st.key)
    const tutor = section?.formTutorId ? staff.get(section.formTutorId) : undefined
    const mine = studentWeeks(st, w0)
    const avg = sectionAverageWeeks(data, st.key, w0)
    const counts = new Array(CODES.length).fill(0)
    for (let i = w0 * SPW; i < st.s.length; i++) counts[st.s[i]]++
    const events = [...st.ev].filter((e) => e.w >= w0).sort((a, b) => b.w * 5 + b.d - (a.w * 5 + a.d))
    const tone = statusOf(m.att)

    return (
        <div className="space-y-4">
            <Link
                href="/edu/students"
                className="animate-fade text-muted hover:text-primary inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
            >
                <ArrowLeft className="size-4" /> Back to register
            </Link>
            <section className="animate-rise border-line bg-surface shadow-card flex flex-wrap items-center gap-4 rounded-2xl border p-5">
                <Avatar name={st.name} seed={st.id} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-ink text-[24px] leading-tight font-semibold">{st.name}</h1>
                        <Pill tone={m.status} dot>
                            {STATUS_LABEL[m.status]}
                        </Pill>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                            schoolOf(st.school).name,
                            `${ygName(st.yg)} · ${secName(st.yg, st.sec)}`,
                            st.stage,
                            st.house && `${st.house} house`,
                            st.nat,
                            st.gender === "M" ? "Boy" : "Girl",
                        ]
                            .filter((c): c is string => !!c)
                            .map((c) => (
                                <Pill key={c}>{c}</Pill>
                            ))}
                        {tutor &&
                            (employees.has(tutor.id) ? (
                                <Link href={`/hr/staff/${tutor.id}`}>
                                    <Pill tone="info" className="hover:bg-primary/15 transition-colors">
                                        Form tutor: {tutor.name}
                                    </Pill>
                                </Link>
                            ) : (
                                <Pill tone="info">Form tutor: {tutor.name}</Pill>
                            ))}
                    </div>
                </div>
                <div className="text-muted text-right text-[11.5px]">{periodLong(w0)}</div>
            </section>

            <KpiGrid>
                <Kpi
                    label="Attendance"
                    icon={<CalendarCheck />}
                    color={`var(--${tone})`}
                    value={pct(m.att)}
                    foot={<span>{m.tot} sessions</span>}
                />
                <Kpi label="Present" icon={<CheckCircle2 />} color="var(--good)" value={fmt(m.p)} foot={<span>sessions</span>} />
                <Kpi
                    label="Late"
                    icon={<Clock />}
                    color="var(--warn)"
                    value={fmt(m.l)}
                    foot={
                        <span>
                            AM {m.amL} · PM {m.pmL}
                        </span>
                    }
                />
                <Kpi label="Authorised" icon={<FileCheck2 />} color="var(--auth)" value={fmt(m.a)} foot={<span>sessions</span>} />
                <Kpi label="Unauthorised" icon={<FileX2 />} color="var(--bad)" value={fmt(m.u)} foot={<span>sessions</span>} />
                <Kpi
                    label="Behaviour net"
                    icon={<Sparkles />}
                    color="var(--c3)"
                    value={signed(m.net)}
                    foot={
                        <>
                            <Pos>+{m.ach}</Pos>
                            <Neg>−{m.inc}</Neg>
                        </>
                    }
                />
            </KpiGrid>

            <Grid>
                <Panel
                    span={8}
                    title="Attendance calendar"
                    subtitle="Each day is split: AM on top, PM below"
                    action={
                        <Legend
                            items={(["present", "late", "auth", "unauth"] as const).map((c) => ({
                                label: CAT_LABEL[c].replace(" absence", ""),
                                color: CAT_COLOR[c],
                            }))}
                        />
                    }
                >
                    <TermCalendar
                        cell={(w, d, dt) => {
                            const am = st.s[w * SPW + d * 2]
                            const pm = st.s[w * SPW + d * 2 + 1]
                            return {
                                parts: [CAT_COLOR[CAT[am]], CAT_COLOR[CAT[pm]]],
                                tip: `${dateLabel(dt)}\nAM: ${CODES[am][0]} ${CODES[am][1]}\nPM: ${CODES[pm][0]} ${CODES[pm][1]}`,
                            }
                        }}
                    />
                </Panel>
                <Panel span={4} title="Session mix">
                    <Donut
                        height={180}
                        data={MIX.map((x, i) => ({ name: x.label, v: [m.p, m.l, m.a, m.u][i], color: x.color }))}
                        center={{ value: pct(m.att), label: "attendance" }}
                        format={(v, t) => `${v} sessions · ${pct(t ? (v / t) * 100 : 0)}`}
                    />
                    <div className="mt-5">
                        <CodeRows counts={counts} limit={5} />
                    </div>
                </Panel>
                <Panel
                    span={7}
                    title="Weekly attendance vs class"
                    subtitle={`Compared with the average for section ${secName(st.yg, st.sec)}`}
                    action={
                        <Legend
                            items={[
                                { label: "Student", color: "var(--primary)" },
                                { label: "Section average", color: "var(--muted)", dashed: true },
                            ]}
                        />
                    }
                >
                    <TrendChart
                        data={mine.map((v, i) => ({ label: WEEKS[w0 + i], me: v, avg: avg[i] }))}
                        series={[
                            { key: "me", label: "Student", color: "var(--primary)", fill: true },
                            { key: "avg", label: "Section average", color: "var(--muted)", dashed: true },
                        ]}
                        yDomain={[(min: number) => Math.max(0, Math.floor(Math.min(min, 70) / 10) * 10), 100]}
                        yFormat={(v) => `${v}%`}
                        valueFormat={(v) => pct(v)}
                        titlePrefix="Week of "
                    />
                </Panel>
                <Panel
                    span={5}
                    title="Behaviour log"
                    subtitle={`${events.length} records`}
                    bodyClassName="max-h-[300px] overflow-y-auto pr-1"
                >
                    {events.length === 0 ? (
                        <Empty>No behaviour records in this period.</Empty>
                    ) : (
                        <ol className="before:bg-line-strong relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px">
                            {events.map((e, i) => {
                                const by = e.byStaffId ? staff.get(e.byStaffId) : undefined
                                return (
                                    <li key={i} className="relative pl-6">
                                        <i
                                            className={`absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-white ${e.pts > 0 ? "bg-good" : "bg-bad"}`}
                                        />
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-ink text-[13px] font-semibold">{BTYPES[e.t]?.n ?? "Behaviour"}</div>
                                                <div className="text-muted text-[11.5px]">
                                                    {dateLabel(dateOf(e.w, e.d))}
                                                    {e.loc && ` · ${e.loc}`}
                                                    {by && (
                                                        <>
                                                            {" · recorded by "}
                                                            {employees.has(by.id) ? (
                                                                <Link
                                                                    href={`/hr/staff/${by.id}`}
                                                                    className="text-ink-2 hover:text-primary font-semibold hover:underline"
                                                                >
                                                                    {by.name}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-ink-2 font-semibold">{by.name}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <Pill tone={e.pts > 0 ? "good" : "bad"}>{signed(e.pts)}</Pill>
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                    )}
                </Panel>
            </Grid>
        </div>
    )
}
