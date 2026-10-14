"use client"

import { BarsChart, Donut } from "@/components/charts/charts"
import { Kpi, KpiGrid, Neg, Pos } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Matrix } from "@/components/insights/matrix"
import { Meter } from "@/components/ui/meter"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { fmt, pct } from "@/lib/format"
import type { Tone } from "@/lib/status"
import { Award, Scale, ShieldAlert, UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import { ATT_BANDS, attBand, BEH_BANDS, behBand } from "../../analytics"
import { EduPage } from "../../components/edu-page"
import { PointsBalance, studentItem } from "../../components/widgets"
import { useEdu } from "../../state"

const LOC_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"]

export function EduBehaviourScreen() {
    const router = useRouter()
    const setRegister = useEdu((s) => s.setRegister)
    return (
        <EduPage title="Behaviour" description="Achievement and incident points, where they happen, and who stands out.">
            {({ a }) => {
                const t = a.totals
                const ratio = t.ACH + t.INC ? (t.ACH / (t.ACH + t.INC)) * 100 : 0
                const incShare = a.n ? t.withInc / a.n : 0
                const counts = [0, 1, 2].map(() => [0, 0, 0])
                for (const st of a.list) counts[behBand(st.m)][attBand(st.m)]++
                const locTotal = a.locations.reduce((s, l) => s + l.v, 0)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Achievement points"
                                icon={<Award />}
                                color="var(--good)"
                                value={<Pos>+{fmt(t.ACH)}</Pos>}
                                foot={
                                    <>
                                        <span>{fmt(t.achN)} awards</span>
                                        <Pill tone="good">{(a.n ? t.ACH / a.n : 0).toFixed(1)} per student</Pill>
                                    </>
                                }
                            />
                            <Kpi
                                label="Incident points"
                                icon={<ShieldAlert />}
                                color="var(--bad)"
                                value={<Neg>−{fmt(t.INC)}</Neg>}
                                foot={
                                    <>
                                        <span>{fmt(t.incN)} incidents</span>
                                        <Pill tone="bad">{(a.n ? t.INC / a.n : 0).toFixed(1)} per student</Pill>
                                    </>
                                }
                            />
                            <Kpi
                                label="Positive ratio"
                                icon={<Scale />}
                                color="var(--good)"
                                value={pct(ratio, 0)}
                                foot={<Meter value={ratio} color="var(--good)" className="flex-1" />}
                            />
                            <Kpi
                                label="Students with incidents"
                                icon={<UserX />}
                                color="var(--warn)"
                                value={fmt(t.withInc)}
                                foot={
                                    <Pill tone={incShare < 0.3 ? "good" : incShare < 0.45 ? "warn" : "bad"}>
                                        {pct(incShare * 100)} of students
                                    </Pill>
                                }
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Weekly points balance"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Achievement", color: "var(--good)" },
                                            { label: "Incident", color: "var(--bad)" },
                                        ]}
                                    />
                                }
                            >
                                <PointsBalance a={a} />
                            </Panel>
                            <Panel span={4} title="Incidents by location">
                                <Donut
                                    height={200}
                                    data={a.locations.map((l, i) => ({ name: l.name, v: l.v, color: LOC_COLORS[i] }))}
                                    center={{ value: fmt(locTotal), label: "incidents" }}
                                />
                                <Legend
                                    className="mt-4 justify-center"
                                    items={a.locations.map((l, i) => ({
                                        label: `${l.name} ${pct(locTotal ? (l.v / locTotal) * 100 : 0, 0)}`,
                                        color: LOC_COLORS[i],
                                    }))}
                                />
                            </Panel>
                            <Panel span={7} title="Attendance × behaviour" subtitle="Click a box to list those students in the register">
                                <Matrix
                                    rows={BEH_BANDS}
                                    cols={ATT_BANDS}
                                    counts={counts}
                                    colCaption="Attendance"
                                    tone={(r, c): Tone => (r === 2 || c === 2 ? "bad" : r === 1 || c === 1 ? "warn" : "good")}
                                    onSelect={(bi, ai) => {
                                        setRegister({
                                            cell: { ai, bi, label: `${BEH_BANDS[bi][1]} behaviour · attendance ${ATT_BANDS[ai][0]}` },
                                        })
                                        router.push("/edu/students")
                                    }}
                                />
                            </Panel>
                            <Panel span={5} title="Points by year group" subtitle="Achievement vs incident points">
                                <BarsChart
                                    height={300}
                                    data={a.yearGroups}
                                    series={[
                                        { key: "ach", label: "Achievement", color: "var(--good)" },
                                        { key: "inc", label: "Incident", color: "var(--bad)" },
                                    ]}
                                    horizontal
                                    stacked
                                    signedAbs
                                    categoryWidth={40}
                                    valueFormat={(v) => `${fmt(v)} pts`}
                                />
                            </Panel>
                            <Panel span={4} title="Top achievers">
                                <Leaderboard
                                    items={[...a.list]
                                        .sort((x, y) => y.m.ach - x.m.ach)
                                        .slice(0, 5)
                                        .map((st) => studentItem(st, `+${st.m.ach}`, "pos"))}
                                    empty="No students in this filter."
                                />
                            </Panel>
                            <Panel span={4} title="Highest incident points">
                                <Leaderboard
                                    items={a.list
                                        .filter((s) => s.m.inc > 0)
                                        .sort((x, y) => y.m.inc - x.m.inc)
                                        .slice(0, 5)
                                        .map((st) => studentItem(st, `−${st.m.inc}`, "neg"))}
                                    empty="No incidents in this filter."
                                />
                            </Panel>
                            <Panel span={4} title="Behaviour types" subtitle="Net points by type">
                                <BarsChart
                                    height={300}
                                    data={a.types}
                                    xKey="name"
                                    series={[{ key: "v", label: "Points", color: "var(--good)" }]}
                                    colorOf={(r) => (Number(r.v) > 0 ? "var(--good)" : "var(--bad)")}
                                    horizontal
                                    signedAbs
                                    categoryWidth={132}
                                    valueFormat={(v) => `${fmt(v)} pts`}
                                />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </EduPage>
    )
}
