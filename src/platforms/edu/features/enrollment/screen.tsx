"use client"

import { BarsChart, Donut } from "@/components/charts/charts"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Legend } from "@/components/insights/legend"
import { Empty, Grid, Panel } from "@/components/ui/panel"
import { Tip } from "@/components/ui/tip"
import { fmt, pct } from "@/lib/format"
import { Armchair, CheckCircle2, User, UserRound, Users } from "lucide-react"
import { EduPage } from "../../components/edu-page"
import { SCHOOLS, schoolOf, secName, YG_ORDER, ygShort } from "../../data/constants"
import type { Section } from "../../data/types"
import { useEdu } from "../../state"

/** AJ, MB, MG: compact school tags for the capacity grid (full name is in the tooltip). */
const schoolAbbr = (id: string) =>
    schoolOf(id)
        .short.split(" ")
        .map((w) => w[0])
        .join("")

export function EduEnrollmentScreen() {
    const setYg = useEdu((s) => s.setYg)
    return (
        <EduPage title="Enrollment" description="Who is enrolled, where, and how full each section is.">
            {({ a, f }) => {
                const capRows: Record<string, Section[]> = {}
                for (const x of a.secsIn) (capRows[x.yg] ||= []).push(x)
                return (
                    <>
                        <KpiGrid>
                            <Kpi
                                label="Students"
                                icon={<Users />}
                                color="var(--c1)"
                                value={fmt(a.n)}
                                foot={<span>{a.secsIn.length} sections</span>}
                            />
                            <Kpi
                                label="Boys"
                                icon={<User />}
                                color="var(--c1)"
                                value={fmt(a.male)}
                                foot={<span>{pct(a.n ? (a.male / a.n) * 100 : 0, 0)}</span>}
                            />
                            <Kpi
                                label="Girls"
                                icon={<UserRound />}
                                color="var(--c4)"
                                value={fmt(a.female)}
                                foot={<span>{pct(a.n ? (a.female / a.n) * 100 : 0, 0)}</span>}
                            />
                            <Kpi
                                label="Seats available"
                                icon={<Armchair />}
                                color="var(--c2)"
                                value={a.cap ? fmt(Math.max(a.cap - a.n, 0)) : "—"}
                                foot={<span>{a.cap ? `of ${fmt(a.cap)} capacity` : "Capacity not recorded"}</span>}
                            />
                            <Kpi
                                label="Full sections"
                                icon={<CheckCircle2 />}
                                color="var(--good)"
                                value={a.cap ? fmt(a.fullSecs) : "—"}
                                foot={<span>{a.cap ? "at 100% capacity" : "Capacity not recorded"}</span>}
                            />
                        </KpiGrid>
                        <Grid>
                            <Panel
                                span={8}
                                title="Students per year group"
                                subtitle="Click a bar to focus on that year group"
                                action={
                                    <Legend
                                        items={[
                                            { label: "Boys", color: "var(--c1)" },
                                            { label: "Girls", color: "var(--c4)" },
                                        ]}
                                    />
                                }
                            >
                                <BarsChart
                                    data={a.yearGroups}
                                    series={[
                                        { key: "M", label: "Boys", color: "var(--c1)" },
                                        { key: "F", label: "Girls", color: "var(--c4)" },
                                    ]}
                                    stacked
                                    onBarClick={(r) => setYg(String(r.yg))}
                                    valueFormat={(v) => `${fmt(v)} students`}
                                />
                            </Panel>
                            <Panel span={4} title="Gender balance">
                                <Donut
                                    height={230}
                                    data={[
                                        { name: "Boys", v: a.male, color: "var(--c1)" },
                                        { name: "Girls", v: a.female, color: "var(--c4)" },
                                    ]}
                                    center={{ value: fmt(a.n), label: "students" }}
                                />
                                <Legend
                                    className="mt-4 justify-center"
                                    items={[
                                        { label: `Boys ${pct(a.n ? (a.male / a.n) * 100 : 0)}`, color: "var(--c1)" },
                                        { label: `Girls ${pct(a.n ? (a.female / a.n) * 100 : 0)}`, color: "var(--c4)" },
                                    ]}
                                />
                            </Panel>
                            <Panel
                                span={5}
                                title="Section capacity"
                                subtitle={
                                    a.cap
                                        ? "Enrolled ÷ capacity · ≥90% green, 75–89% amber, under 75% red"
                                        : "Students enrolled per section (the source doesn’t record capacity)"
                                }
                                bodyClassName="max-h-[352px] overflow-y-auto pr-1"
                            >
                                {Object.keys(capRows).length === 0 ? (
                                    <Empty>No sections in this filter.</Empty>
                                ) : (
                                    <div className="space-y-2.5">
                                        {Object.keys(capRows)
                                            .sort((x, y) => (YG_ORDER[x] ?? 99) - (YG_ORDER[y] ?? 99))
                                            .map((yg) => (
                                                <div key={yg} className="flex gap-3">
                                                    <div className="text-ink-2 w-8 shrink-0 pt-2 text-[11.5px] font-bold">
                                                        {ygShort(yg)}
                                                    </div>
                                                    <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(98px,1fr))] gap-1.5">
                                                        {capRows[yg].map((x) => {
                                                            const e = a.enrolledByKey[x.key] || 0
                                                            const fill = x.cap ? (e / x.cap) * 100 : null
                                                            const c =
                                                                fill === null
                                                                    ? "var(--c1)"
                                                                    : fill >= 90
                                                                      ? "var(--good)"
                                                                      : fill >= 75
                                                                        ? "var(--warn)"
                                                                        : "var(--bad)"
                                                            const lbl =
                                                                f.school === "all"
                                                                    ? `${schoolAbbr(x.school)} · ${secName(x.yg, x.sec)}`
                                                                    : secName(x.yg, x.sec)
                                                            return (
                                                                <Tip
                                                                    key={x.key}
                                                                    content={
                                                                        fill === null
                                                                            ? `${schoolOf(x.school).name}\nSection ${secName(x.yg, x.sec)}\n${e} students enrolled`
                                                                            : `${schoolOf(x.school).name}\nSection ${secName(x.yg, x.sec)}\n${e} of ${x.cap} seats filled\n${pct(fill, 0)} capacity used`
                                                                    }
                                                                >
                                                                    <div className="border-line bg-surface-2 hover:border-line-strong rounded-lg border px-2 py-1.5 transition-colors">
                                                                        <div className="flex items-center justify-between gap-1 text-[10.5px]">
                                                                            <span className="text-ink-2 truncate font-semibold">{lbl}</span>
                                                                            <em className="tabular text-muted font-semibold not-italic">
                                                                                {x.cap ? `${e}/${x.cap}` : e}
                                                                            </em>
                                                                        </div>
                                                                        <div className="bg-bg-2 mt-1 h-1 overflow-hidden rounded-full">
                                                                            <i
                                                                                className="block h-full rounded-full"
                                                                                style={{
                                                                                    width: `${fill === null ? (e ? 100 : 0) : Math.min(fill, 100)}%`,
                                                                                    background: c,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </Tip>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </Panel>
                            <Panel span={4} title="Students by school" subtitle="On roll in the current filter">
                                <BarsChart
                                    height={340}
                                    data={SCHOOLS.map((s) => ({
                                        name: s.short,
                                        v: a.list.filter((st) => st.school === s.id).length,
                                    })).filter((x) => x.v > 0)}
                                    xKey="name"
                                    series={[{ key: "v", label: "Students", color: "var(--c2)" }]}
                                    valueFormat={(v) => `${fmt(v)} students`}
                                />
                            </Panel>
                            <Panel span={3} title="Nationality mix" subtitle="Top 7 nationalities">
                                <BarsChart
                                    height={340}
                                    data={a.nationalities}
                                    xKey="name"
                                    series={[{ key: "v", label: "Students", color: "var(--c3)" }]}
                                    horizontal
                                    categoryWidth={78}
                                />
                            </Panel>
                        </Grid>
                    </>
                )
            }}
        </EduPage>
    )
}
