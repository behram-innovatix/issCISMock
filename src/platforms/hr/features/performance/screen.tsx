"use client"

import { BarsChart, Donut, RadarPlot } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Leaderboard } from "@/components/insights/leaderboard"
import { Legend } from "@/components/insights/legend"
import { Matrix } from "@/components/insights/matrix"
import { Meter } from "@/components/ui/meter"
import { Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { avg, fmt, pct, score } from "@/lib/format"
import type { Tone } from "@/lib/status"
import { Award, ClipboardCheck, Gauge, ShieldAlert, Star, TrendingDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { PERF_BANDS, type ScoredEmployee, STAFF_ATT_BANDS } from "../../analytics"
import { HrPage } from "../../components/hr-page"
import { RATING_COLOR, RATING_TONE, ScoreDistribution, staffItem } from "../../components/widgets"
import { COMPETENCIES, CURRENT_CYCLE, ratingOf } from "../../data/constants"
import { useHr } from "../../state"

const competencyAvg = (list: ScoredEmployee[], i: number) => {
    const s = list.map((e) => [...e.appraisals].reverse().find((a) => a.scores)?.scores?.[i]).filter((x): x is number => x != null)
    return avg(s)
}

export function HrPerformanceScreen() {
    const router = useRouter()
    const setRegister = useHr((s) => s.setRegister)
    return (
        <HrPage title="Performance & Appraisals" description="Appraisal outcomes, competencies and KPI attainment, linked to attendance.">
            {({ a }) => {
                const rating = ratingOf(a.avgAppraisal)
                const scored = a.list.filter((e) => e.m.appraisal != null)
                const teaching = a.list.filter((e) => e.teaching)
                const support = a.list.filter((e) => !e.teaching)
                const radar = COMPETENCIES.map((name, i) => ({
                    name,
                    teaching: competencyAvg(teaching, i),
                    support: competencyAvg(support, i),
                }))
                const ratingTot = a.ratings.reduce((s, r) => s + r.v, 0)
                const low =
                    (a.ratings.find((r) => r.name === "Developing")?.v ?? 0) + (a.ratings.find((r) => r.name === "Unsatisfactory")?.v ?? 0)
                const kpiAvg = avg(a.list.map((e) => e.m.kpi))
                return (
                    <>
                        <KpiGrid>
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
                                label="Exceeding"
                                icon={<Award />}
                                color="var(--good)"
                                value={fmt(a.ratings[0].v)}
                                foot={<span>{pct(ratingTot ? (a.ratings[0].v / ratingTot) * 100 : 0)} of appraised staff</span>}
                            />
                            <Kpi
                                label="Below expectations"
                                icon={<TrendingDown />}
                                color="var(--warn)"
                                value={fmt(low)}
                                foot={<span>Developing or Unsatisfactory</span>}
                            />
                            <Kpi
                                label="Cycle completion"
                                icon={<ClipboardCheck />}
                                color="var(--c2)"
                                value={pct(a.completion, 0)}
                                foot={
                                    <>
                                        <Meter value={a.completion} color="var(--c2)" className="flex-1" />
                                        <span>{CURRENT_CYCLE.label}</span>
                                    </>
                                }
                            />
                            <Kpi
                                label="KPI attainment"
                                icon={<Gauge />}
                                color="var(--c3)"
                                value={pct(kpiAvg, 0)}
                                foot={<span>average of target met</span>}
                            />
                            <Kpi
                                label="Staff at risk"
                                icon={<ShieldAlert />}
                                color="var(--bad)"
                                value={fmt(a.atRisk)}
                                foot={<span>{fmt(a.watch)} more on watch</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={5}
                                title="Appraisal score distribution"
                                subtitle={`${fmt(scored.length)} staff with a completed appraisal`}
                            >
                                <ScoreDistribution a={a} />
                            </Panel>
                            <Panel span={3} title="Rating mix">
                                <Donut
                                    height={190}
                                    data={a.ratings.map((r) => ({ name: r.name, v: r.v, color: RATING_COLOR[r.name] }))}
                                    center={{ value: score(a.avgAppraisal), label: "average" }}
                                    format={(v, t) => `${fmt(v)} staff · ${pct(t ? (v / t) * 100 : 0)}`}
                                />
                                <Legend
                                    className="mt-4 justify-center"
                                    items={a.ratings.map((r) => ({ label: `${r.name} ${fmt(r.v)}`, color: RATING_COLOR[r.name] }))}
                                />
                            </Panel>
                            <Panel
                                span={4}
                                title="Competency profile"
                                subtitle="Average score per competency (1–5)"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Teaching", color: "var(--c1)" },
                                            { label: "Support", color: "var(--c2)" },
                                        ]}
                                    />
                                }
                            >
                                <RadarPlot
                                    height={260}
                                    data={radar}
                                    domain={[2, 5]}
                                    series={[
                                        ...(teaching.length
                                            ? [{ key: "teaching", label: "Teaching", color: "var(--c1)", fill: true }]
                                            : []),
                                        ...(support.length ? [{ key: "support", label: "Support", color: "var(--c2)", fill: true }] : []),
                                    ]}
                                />
                            </Panel>
                            <Panel
                                span={7}
                                title="Performance × attendance"
                                subtitle="Latest appraisal against staff attendance · click a box to list those staff"
                            >
                                <Matrix
                                    rows={PERF_BANDS.map((p) => [p, p.split(" ")[0] + " performer"] as const)}
                                    cols={STAFF_ATT_BANDS.map((c) => [c, c] as const)}
                                    counts={a.nineBox}
                                    colCaption="Attendance"
                                    // severity grows with distance from the top-left (high performer, reliable attendance)
                                    tone={(r, c): Tone => (r + c <= 1 ? "good" : r + c === 2 ? "warn" : "bad")}
                                    onSelect={(r, c) => {
                                        setRegister({ box: { r, c, label: `${PERF_BANDS[r]} · attendance ${STAFF_ATT_BANDS[c]}` } })
                                        router.push("/hr/staff")
                                    }}
                                />
                                <Note className="mt-3">
                                    Top-left are your strongest and most reliable people; bottom-right combine low scores with poor
                                    attendance and need a plan.
                                </Note>
                            </Panel>
                            <Panel span={5} title="KPI attainment by department" subtitle="Average share of KPI targets met">
                                <BarsChart
                                    height={Math.max(260, a.byDept.length * 26)}
                                    data={[...a.byDept].sort((x, y) => y.kpi - x.kpi)}
                                    series={[{ key: "kpi", label: "Attainment", color: "var(--c3)" }]}
                                    colorOf={(r) =>
                                        Number(r.kpi) >= 95 ? "var(--good)" : Number(r.kpi) >= 85 ? "var(--c3)" : "var(--warn)"
                                    }
                                    horizontal
                                    categoryWidth={150}
                                    yDomain={[0, 120]}
                                    yFormat={(v) => `${v}%`}
                                    valueFormat={(v) => pct(v, 0)}
                                    target={{ value: 100, label: "100%" }}
                                />
                            </Panel>
                            <Panel span={4} title="Top performers">
                                <Leaderboard
                                    items={[...scored]
                                        .sort((x, y) => y.m.appraisal! - x.m.appraisal!)
                                        .slice(0, 6)
                                        .map((e) => staffItem(e, score(e.m.appraisal!), "pos"))}
                                />
                            </Panel>
                            <Panel span={4} title="Lowest appraisal scores">
                                <Leaderboard
                                    items={[...scored]
                                        .sort((x, y) => x.m.appraisal! - y.m.appraisal!)
                                        .slice(0, 6)
                                        .map((e) => staffItem(e, score(e.m.appraisal!), "neg"))}
                                />
                            </Panel>
                            <Panel span={4} title="Appraisal by department" subtitle="Average latest score">
                                <BarsChart
                                    height={Math.max(260, a.byDept.length * 26)}
                                    data={[...a.byDept].filter((d) => d.appraisal > 0).sort((x, y) => y.appraisal - x.appraisal)}
                                    series={[{ key: "appraisal", label: "Average score", color: "var(--c1)" }]}
                                    horizontal
                                    categoryWidth={150}
                                    yDomain={[1, 5]}
                                    yFormat={(v) => v.toFixed(1)}
                                    valueFormat={(v) => score(v)}
                                />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </HrPage>
    )
}
