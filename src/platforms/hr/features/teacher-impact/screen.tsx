"use client"

import { BarsChart, ScatterPlot } from "@/components/charts/charts"
import { type Column, DataTable } from "@/components/insights/data-table"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { SearchInput } from "@/components/insights/search-input"
import { Avatar } from "@/components/ui/avatar"
import { Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { avg, fmt, pct, score } from "@/lib/format"
import { statusOf } from "@/lib/status"
import { GraduationCap, Link2, School, ShieldAlert, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { type TeacherImpactRow, teacherImpact } from "../../analytics"
import { type HrCtx, HrPage } from "../../components/hr-page"
import { RATING_COLOR, scoreColor } from "../../components/widgets"
import { DEPARTMENTS, deptOf, locationOf, ratingOf } from "../../data/constants"
import { useHr } from "../../state"

function pearson(xs: number[], ys: number[]) {
    const mx = avg(xs)
    const my = avg(ys)
    let n = 0,
        dx = 0,
        dy = 0
    for (let i = 0; i < xs.length; i++) {
        n += (xs[i] - mx) * (ys[i] - my)
        dx += (xs[i] - mx) ** 2
        dy += (ys[i] - my) ** 2
    }
    return dx && dy ? n / Math.sqrt(dx * dy) : 0
}

const COLUMNS: Column<TeacherImpactRow>[] = [
    {
        key: "name",
        header: "Teacher",
        sort: (r) => r.e.name,
        render: (r) => (
            <span className="flex items-center gap-3">
                <Avatar name={r.e.name} seed={r.e.id} size="sm" />
                <span className="min-w-0">
                    <b className="text-ink group-hover:text-primary block truncate font-semibold">{r.e.name}</b>
                    <span className="text-muted block truncate text-[11.5px]">
                        {deptOf(r.e.dept).name} · {locationOf(r.e.location).short}
                    </span>
                </span>
            </span>
        ),
    },
    {
        key: "sections",
        header: "Classes",
        align: "right",
        sort: (r) => r.sections,
        render: (r) => <span className="tabular text-ink-2">{r.sections}</span>,
    },
    {
        key: "students",
        header: "Students",
        align: "right",
        sort: (r) => r.students,
        render: (r) => <span className="tabular text-ink-2">{fmt(r.students)}</span>,
    },
    {
        key: "classAtt",
        header: "Class attendance",
        align: "right",
        sort: (r) => r.classAtt,
        render: (r) => <Pill tone={statusOf(r.classAtt)}>{pct(r.classAtt)}</Pill>,
    },
    {
        key: "net",
        header: "Behaviour / student",
        align: "right",
        sort: (r) => r.net,
        render: (r) => (
            <span className={`tabular font-semibold ${r.net >= 0 ? "text-good-ink" : "text-bad-ink"}`}>
                {r.net >= 0 ? "+" : "−"}
                {Math.abs(r.net).toFixed(1)}
            </span>
        ),
    },
    {
        key: "atRisk",
        header: "Students at risk",
        align: "right",
        sort: (r) => r.atRiskPct,
        render: (r) => (
            <span className="tabular text-ink-2">
                {r.atRisk} <span className="text-muted">({pct(r.atRiskPct, 0)})</span>
            </span>
        ),
    },
    {
        key: "appraisal",
        header: "Appraisal",
        align: "right",
        sort: (r) => r.appraisal ?? -1,
        render: (r) =>
            r.appraisal == null ? (
                <span className="text-muted">Not yet</span>
            ) : (
                <span className="inline-flex items-center gap-2">
                    <i className="size-2 rounded-full" style={{ background: scoreColor(r.appraisal) }} />
                    <b className="tabular text-ink font-semibold">{score(r.appraisal)}</b>
                </span>
            ),
    },
]

export function HrTeacherImpactScreen() {
    const router = useRouter()
    const impact = useHr((s) => s.impact)
    const setImpact = useHr((s) => s.setImpact)
    return (
        <HrPage title="Teacher Impact" description="Each teacher's classes from EDU, side by side with their HR record.">
            {(ctx) => <ImpactBody ctx={ctx} impact={impact} setImpact={setImpact} router={router} />}
        </HrPage>
    )
}

function ImpactBody({
    ctx: { a, edu, f },
    impact,
    setImpact,
    router,
}: {
    ctx: HrCtx
    impact: ReturnType<typeof useHr.getState>["impact"]
    setImpact: ReturnType<typeof useHr.getState>["setImpact"]
    router: ReturnType<typeof useRouter>
}) {
    const rows = useMemo(() => teacherImpact(edu, a.list, f.w0), [edu, a.list, f.w0])
    const withScore = rows.filter((r) => r.appraisal != null)
    const r = pearson(
        withScore.map((x) => x.classAtt),
        withScore.map((x) => x.appraisal!),
    )
    const studentsInScope = f.location === "all" ? edu.students.length : edu.students.filter((s) => s.school === f.location).length
    const teachers = rows.length
    const avgClassAtt = avg(rows.map((x) => x.classAtt))
    const lowClasses = rows.filter((x) => x.classAtt < 93).length
    const q = impact.q.trim().toLowerCase()
    const tableRows = q ? rows.filter((x) => x.e.name.toLowerCase().includes(q) || deptOf(x.e.dept).name.toLowerCase().includes(q)) : rows
    const strength = Math.abs(r) >= 0.5 ? "strong" : Math.abs(r) >= 0.3 ? "moderate" : Math.abs(r) >= 0.1 ? "weak" : "no clear"

    const depts = DEPARTMENTS.filter((d) => d.teaching)
        .map((d) => {
            const g = rows.filter((x) => x.e.dept === d.code)
            const gs = g.filter((x) => x.appraisal != null)
            return { label: d.name, n: g.length, classAtt: avg(g.map((x) => x.classAtt)), appraisal: avg(gs.map((x) => x.appraisal!)) }
        })
        .filter((d) => d.n > 0)

    return (
        <>
            <KpiGrid>
                <Kpi
                    label="Teachers"
                    icon={<GraduationCap />}
                    color="var(--c1)"
                    value={fmt(teachers)}
                    foot={<span>with timetabled classes</span>}
                />
                <Kpi
                    label="Student : teacher"
                    icon={<Users />}
                    color="var(--c2)"
                    value={a.teaching ? `${(studentsInScope / a.teaching).toFixed(1)} : 1` : "–"}
                    foot={<span>students per teacher in scope</span>}
                />
                <Kpi
                    label="Avg class attendance"
                    icon={<School />}
                    color={`var(--${statusOf(avgClassAtt)})`}
                    value={pct(avgClassAtt)}
                    foot={<span>students in their classes</span>}
                />
                <Kpi
                    label="Classes below 93%"
                    icon={<ShieldAlert />}
                    color="var(--bad)"
                    value={fmt(lowClasses)}
                    foot={<span>teachers whose classes are slipping</span>}
                />
                <Kpi
                    label="Appraisal ↔ attendance"
                    icon={<Link2 />}
                    color="var(--c3)"
                    value={`r = ${r.toFixed(2)}`}
                    foot={<Pill tone={r >= 0.3 ? "good" : r >= 0.1 ? "info" : "neutral"}>{strength} link</Pill>}
                />
            </KpiGrid>
            <Grid>
                <Panel
                    span={8}
                    title="Appraisal score vs class attendance"
                    subtitle="Each dot is a teacher · click to open their profile"
                    action={
                        <Legend
                            items={(["Exceeds", "Meets", "Developing", "Unsatisfactory"] as const).map((x) => ({
                                label: x,
                                color: RATING_COLOR[x],
                            }))}
                        />
                    }
                >
                    <ScatterPlot
                        height={330}
                        data={withScore.map((x) => ({
                            id: x.e.id,
                            name: x.e.name,
                            dept: deptOf(x.e.dept).name,
                            classAtt: +x.classAtt.toFixed(2),
                            appraisal: x.appraisal!,
                        }))}
                        xKey="classAtt"
                        yKey="appraisal"
                        xLabel="Class attendance %"
                        yLabel="Appraisal score"
                        xDomain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
                        yDomain={[1, 5]}
                        xFormat={(v) => `${v.toFixed(1)}%`}
                        yFormat={(v) => v.toFixed(2)}
                        colorOf={(row) => RATING_COLOR[ratingOf(Number(row.appraisal))]}
                        tipTitle={(row) => (
                            <>
                                {String(row.name)}
                                <div className="text-muted text-[11px] font-normal">{String(row.dept)}</div>
                            </>
                        )}
                        onPointClick={(row) => router.push(`/hr/staff/${row.id}`)}
                        refX={95}
                        refY={3.5}
                    />
                    <Note className="mt-2">
                        Correlation of <b>{r.toFixed(2)}</b> across {fmt(withScore.length)} appraised teachers: a {strength} positive
                        relationship between how teachers are rated and how often their students attend. Dashed lines mark the 95%
                        attendance target and the “Meets” threshold (3.5).
                    </Note>
                </Panel>
                <Panel
                    span={4}
                    title="By department"
                    subtitle="Average class attendance"
                    action={<Legend items={[{ label: "Class attendance", color: "var(--c1)" }]} />}
                >
                    <BarsChart
                        height={330}
                        data={[...depts].sort((x, y) => y.classAtt - x.classAtt)}
                        series={[{ key: "classAtt", label: "Class attendance", color: "var(--c1)" }]}
                        colorOf={(row) => `var(--${statusOf(Number(row.classAtt))})`}
                        horizontal
                        categoryWidth={150}
                        yDomain={[88, 100]}
                        yFormat={(v) => `${v}%`}
                        valueFormat={(v) => pct(v)}
                        target={{ value: 95, label: "95%" }}
                    />
                </Panel>
                <Panel
                    span={12}
                    title="Teachers and their classes"
                    subtitle={`${fmt(tableRows.length)} teachers · click a row for the full profile`}
                    action={<SearchInput value={impact.q} onChange={(v) => setImpact({ q: v })} placeholder="Search teachers" />}
                >
                    <DataTable
                        rows={tableRows}
                        columns={COLUMNS}
                        sort={impact.sort}
                        dir={impact.dir}
                        page={impact.page}
                        onSort={(sort, dir) => setImpact({ sort, dir })}
                        onPage={(page) => useHr.setState((s) => ({ impact: { ...s.impact, page } }))}
                        href={(x) => `/hr/staff/${x.e.id}`}
                        rowKey={(x) => x.e.id}
                    />
                </Panel>
            </Grid>
        </>
    )
}
