"use client"

import { BarsChart } from "@/components/charts/charts"
import { Heatmap } from "@/components/insights/heatmap"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { dateOf, DAYS, WEEKS } from "@/lib/calendar"
import { dateLabel, fmt, pct } from "@/lib/format"
import { ATT_LABEL, statusOf } from "@/lib/status"
import { CalendarCheck, CheckCircle2, Clock, FileCheck2, FileX2, ShieldAlert } from "lucide-react"
import { EduPage } from "../../components/edu-page"
import { AttendanceMix, CodeRows, WeeklyAttendance } from "../../components/widgets"
import { useEdu } from "../../state"

const heatColor = (v: number) => {
    const s = statusOf(v)
    if (s === "good") return `color-mix(in srgb, var(--good) ${Math.round(48 + Math.min((v - 95) / 5, 1) * 52)}%, #ffffff)`
    return s === "warn" ? "var(--warn)" : "var(--bad)"
}

export function EduAttendanceScreen() {
    const setYg = useEdu((s) => s.setYg)
    return (
        <EduPage title="Attendance" description="Register marks across sessions, days and year groups.">
            {({ a, f }) => {
                const t = a.totals
                const share = (v: number) => pct(t.TOT ? (v / t.TOT) * 100 : 0)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Attendance"
                                icon={<CalendarCheck />}
                                color={`var(--${a.attTone})`}
                                value={pct(a.att)}
                                foot={<Pill tone={a.attTone}>{ATT_LABEL[a.attTone]}</Pill>}
                            />
                            <Kpi
                                label="Present"
                                icon={<CheckCircle2 />}
                                color="var(--good)"
                                value={share(t.P)}
                                foot={<span>{fmt(t.P)} sessions</span>}
                            />
                            <Kpi
                                label="Late"
                                icon={<Clock />}
                                color="var(--warn)"
                                value={share(t.L)}
                                foot={<span>{fmt(t.L)} sessions</span>}
                            />
                            <Kpi
                                label="Authorised absence"
                                icon={<FileCheck2 />}
                                color="var(--auth)"
                                value={share(t.A)}
                                foot={<span>{fmt(t.A)} sessions</span>}
                            />
                            <Kpi
                                label="Unauthorised absence"
                                icon={<FileX2 />}
                                color="var(--bad)"
                                value={share(t.U)}
                                foot={<span>{fmt(t.U)} sessions</span>}
                            />
                            <Kpi
                                label="Persistent absence"
                                icon={<ShieldAlert />}
                                color="var(--bad)"
                                value={fmt(t.persist)}
                                foot={<Pill tone={a.persistTone}>{pct(a.n ? (t.persist / a.n) * 100 : 0)} of students</Pill>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel span={4} title="Session mix">
                                <AttendanceMix a={a} />
                            </Panel>
                            <Panel span={8} title="Weekly attendance" subtitle="Hover for late and absent rates">
                                <WeeklyAttendance a={a} />
                            </Panel>
                            <Panel
                                span={7}
                                title="Attendance by year group"
                                subtitle="Click a bar to focus on that year group"
                                action={
                                    <Legend
                                        items={[
                                            { label: "≥95%", color: "var(--good)" },
                                            { label: "90–95%", color: "var(--warn)" },
                                            { label: "<90%", color: "var(--bad)" },
                                        ]}
                                    />
                                }
                            >
                                <BarsChart
                                    data={a.yearGroups}
                                    series={[{ key: "att", label: "Attendance", color: "var(--good)" }]}
                                    colorOf={(r) => `var(--${statusOf(Number(r.att))})`}
                                    yDomain={[(min: number) => Math.max(0, Math.floor(Math.min(min, 88) - 2)), 100]}
                                    yFormat={(v) => `${v}%`}
                                    valueFormat={(v) => pct(v)}
                                    target={{ value: 95, label: "95%" }}
                                    onBarClick={(r) => setYg(String(r.yg))}
                                />
                            </Panel>
                            <Panel span={5} title="Students by attendance band" subtitle="How attendance is distributed across students">
                                <BarsChart
                                    data={["≥97%", "95–97%", "90–95%", "<90%"].map((label, i) => ({
                                        label,
                                        v: a.bands[i],
                                        c: ["var(--good)", "#5cc394", "var(--warn)", "var(--bad)"][i],
                                    }))}
                                    series={[{ key: "v", label: "Students", color: "var(--good)" }]}
                                    colorOf={(r) => String(r.c)}
                                    valueFormat={(v) => `${fmt(v)} students`}
                                />
                            </Panel>
                            <Panel span={6} title="Day-of-week heatmap" subtitle="Attendance by school day and week">
                                <Heatmap
                                    rows={DAYS}
                                    cols={a.weeks.map((w) => w.label)}
                                    values={a.heat}
                                    color={heatColor}
                                    format={(v) => v.toFixed(1)}
                                    tip={(ri, ci, v) => `${dateLabel(dateOf(a.weeks[ci].w, ri))}\nAttendance: ${pct(v)}`}
                                />
                            </Panel>
                            <Panel
                                span={3}
                                title="AM vs PM"
                                subtitle="Share of sessions"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Late", color: "var(--warn)" },
                                            { label: "Absent", color: "var(--bad)" },
                                        ]}
                                    />
                                }
                            >
                                <BarsChart
                                    height={250}
                                    data={a.ampm}
                                    xKey="name"
                                    series={[
                                        { key: "late", label: "Late", color: "var(--warn)" },
                                        { key: "abs", label: "Absent", color: "var(--bad)" },
                                    ]}
                                    yFormat={(v) => `${v}%`}
                                    valueFormat={(v) => pct(v, 2)}
                                />
                            </Panel>
                            <Panel
                                span={3}
                                title="Mark codes"
                                subtitle={`Top non-present codes · ${f.w0 === 0 ? "term" : WEEKS[f.w0] + " onwards"}`}
                            >
                                <CodeRows counts={a.codeCount} />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </EduPage>
    )
}
