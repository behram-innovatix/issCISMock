"use client"

import { Kpi, KpiGrid, Neg, Pos } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Meter } from "@/components/ui/meter"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { fmt, pct, signed } from "@/lib/format"
import { ATT_LABEL } from "@/lib/status"
import { CalendarCheck, Clock, ShieldAlert, Sparkles, Users, Armchair } from "lucide-react"
import Link from "next/link"
import { EduPage } from "../../components/edu-page"
import { AttendanceMix, PointsBalance, studentItem, WeeklyAttendance } from "../../components/widgets"

export function EduOverviewScreen() {
    return (
        <EduPage title="School Performance & Insights" description="Enrolment, attendance and behaviour at a glance across every school.">
            {({ a }) => {
                const t = a.totals
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Students"
                                icon={<Users />}
                                color="var(--c1)"
                                value={fmt(a.n)}
                                foot={
                                    <span>
                                        {fmt(a.male)} boys · {fmt(a.female)} girls
                                    </span>
                                }
                            />
                            <Kpi
                                label="Capacity used"
                                icon={<Armchair />}
                                color="var(--c2)"
                                value={a.cap ? pct(a.util, 0) : "—"}
                                foot={
                                    a.cap ? (
                                        <>
                                            <Meter value={a.util} color="var(--c2)" className="flex-1" />
                                            <span>{fmt(a.cap)} seats</span>
                                        </>
                                    ) : (
                                        <span>Capacity not recorded · {fmt(a.secsIn.length)} sections</span>
                                    )
                                }
                            />
                            <Kpi
                                label="Attendance"
                                icon={<CalendarCheck />}
                                color={`var(--${a.attTone})`}
                                value={pct(a.att)}
                                foot={
                                    <>
                                        <Pill tone={a.attTone}>{ATT_LABEL[a.attTone]}</Pill>
                                        <span>target 95%</span>
                                    </>
                                }
                            />
                            <Kpi
                                label="Late arrivals"
                                icon={<Clock />}
                                color="var(--warn)"
                                value={pct(a.late)}
                                foot={<span>{fmt(t.L)} sessions</span>}
                            />
                            <Kpi
                                label="Persistent absence"
                                icon={<ShieldAlert />}
                                color="var(--bad)"
                                value={fmt(t.persist)}
                                foot={<Pill tone={a.persistTone}>{pct(a.n ? (t.persist / a.n) * 100 : 0)} of students</Pill>}
                            />
                            <Kpi
                                label="Net behaviour"
                                icon={<Sparkles />}
                                color="var(--c3)"
                                value={signed(t.ACH - t.INC)}
                                foot={
                                    <>
                                        <Pos>+{fmt(t.ACH)}</Pos>
                                        <Neg>−{fmt(t.INC)}</Neg>
                                    </>
                                }
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Weekly attendance"
                                subtitle="Present + late as a share of all sessions, against the 95% target"
                            >
                                <WeeklyAttendance a={a} />
                            </Panel>
                            <Panel span={4} title="Session outcome mix" subtitle="Every AM and PM register mark in the period">
                                <AttendanceMix a={a} />
                            </Panel>
                            <Panel
                                span={8}
                                title="Weekly points balance"
                                subtitle="Achievement points above the line, incident points below"
                            >
                                <PointsBalance a={a} />
                            </Panel>
                            <Panel
                                span={4}
                                title="Needs attention"
                                subtitle="Lowest attendance in this filter"
                                action={
                                    <Link href="/edu/students" className="text-primary text-[12px] font-semibold hover:underline">
                                        View all
                                    </Link>
                                }
                            >
                                <Leaderboard
                                    items={[...a.list]
                                        .sort((x, y) => x.m.att - y.m.att)
                                        .slice(0, 5)
                                        .map((st) => studentItem(st, pct(st.m.att), "neg"))}
                                    empty="No students in this filter."
                                />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </EduPage>
    )
}
