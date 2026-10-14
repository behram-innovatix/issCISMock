"use client"

import { Donut, type Slice } from "@/components/charts/charts"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Segmented } from "@/components/ui/segmented"
import { cn } from "@/lib/cn"
import { fmt, pct } from "@/lib/format"
import { ArrowLeftRight, BookOpen, ChartColumn, GraduationCap, Layers, TrendingUp, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import type { KeyboardEvent, ReactNode } from "react"
import type { EduFilters } from "../../analytics"
import {
    analysisCohort,
    aspectMatrix,
    aspectsOf,
    type AspectRow,
    bandsOf,
    childGroups,
    childLevel,
    selectionTrail,
    tallyAspect,
} from "../../aspects"
import { ASPECT_ANALYSES, aspectOf, type GradeBand, resultSetOf } from "../../data/aspects"
import { ygShort } from "../../data/constants"
import type { Student } from "../../data/types"
import { EduPage } from "../../components/edu-page"
import { useEdu } from "../../state"
import { useAspectValues } from "./hooks"
import { type Outcome, useAspects } from "./state"

const ASPECT_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"]

/** Ordered ramp from a light tint (lowest band) to the primary blue (highest). */
const bandColor = (i: number, n: number) => `color-mix(in srgb, var(--primary) ${Math.round(22 + (78 * i) / Math.max(1, n - 1))}%, white)`

/** Heat shading by share of valid results, as in the reference matrix. */
const shade = (share: number) =>
    share > 0
        ? { background: `color-mix(in srgb, var(--primary) ${Math.round(6 + share * 44)}%, var(--surface))`, color: share > 0.55 ? "#fff" : undefined }
        : undefined

const bandLabel = (b: GradeBand) => (b.start != null ? `${b.grade} (${b.start}–${b.end})` : b.grade)

const cellText = (outcome: Outcome, r: AspectRow, i: number) =>
    outcome === "pct" ? (r.banded ? pct((r.bands[i] / r.banded) * 100) : "N/A") : fmt(r.bands[i])

const onEnter = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        fn()
    }
}

export function EduAspectsScreen() {
    return (
        <EduPage
            title="Aspect Analysis"
            description="Assessment results by grade band for each saved aspect analysis, from the whole group down to individual students."
        >
            {({ data, a, f }) => <AspectsBody students={data.students} list={a.list} f={f} />}
        </EduPage>
    )
}

function AspectsBody({
    students,
    list,
    f,
}: {
    students: Student[]
    list: Student[]
    f: EduFilters
}) {
    const router = useRouter()
    const idx = useAspectValues(students)
    const { analysis, outcome, transpose, aspect: picked, setAnalysis, setOutcome, toggleTranspose, setAspect } = useAspects()
    const { setSchool, setStage, setYg, setSec } = useEdu()

    const an = ASPECT_ANALYSES.find((x) => x.id === analysis) ?? ASPECT_ANALYSES[0]
    const pattern = aspectsOf(an)
    // the focused aspect must belong to the selected analysis's pattern
    const aspect = pattern.includes(picked) ? picked : pattern[0]
    const bands = bandsOf(an)
    const rs = resultSetOf(an.resultSet)
    const trail = selectionTrail(f)
    const here = trail[trail.length - 1]

    // memoised by the React Compiler
    const cohort = analysisCohort(list, an)
    const rows = aspectMatrix(list, idx, an)
    const level = childLevel(f)
    const groups = childGroups(list, level)
        .map((g) => ({ g, r: tallyAspect(g.students, idx, an, aspect) }))
        .filter((x): x is { g: typeof x.g; r: AspectRow } => x.r !== null)
    const total = tallyAspect(list, idx, an, aspect)

    const drill = (key: string) => {
        if (level === "school") setSchool(key)
        else if (level === "stage") setStage(key)
        else if (level === "year group") setYg(key)
        else if (level === "section") setSec(key)
        else router.push(`/edu/students/${key}`)
    }

    const noRows = "No students in this analysis’s year groups at the current selection."

    return (
        <>
            {/* analysis controls */}
            <div className="border-line bg-surface shadow-card animate-rise flex flex-wrap items-end gap-3 rounded-2xl border p-4">
                <FilterSelect
                    label="Aspect analysis"
                    icon={<ChartColumn />}
                    value={an.id}
                    options={[...ASPECT_ANALYSES]
                        .sort((x, y) => x.order - y.order)
                        .map((x) => ({ value: x.id, label: x.name, sub: `${resultSetOf(x.resultSet).name} · ${x.gradePattern}` }))}
                    onChange={setAnalysis}
                    className="w-full sm:w-80"
                />
                <div>
                    <span className="eyebrow mb-1 block pl-0.5">Outcome type</span>
                    <Segmented
                        label="Outcome type"
                        value={outcome}
                        onChange={setOutcome}
                        options={[
                            { value: "count", label: "Count" },
                            { value: "pct", label: "Percentage" },
                        ]}
                    />
                </div>
                <Button onClick={toggleTranspose} aria-pressed={transpose} variant={transpose ? "soft" : "ghost"} title="Swap rows and columns">
                    <ArrowLeftRight className="size-4" /> Swap rows / columns
                </Button>
                <Note className="basis-full">
                    Results come from the selected analysis’s result set, grade pattern and aspect pattern, for the school, stage, year group,
                    section and gender chosen above. The Period filter does not apply here.
                </Note>
            </div>

            {/* analysis header */}
            <Grid>
                <Panel span={12}>
                    <h2 className="font-display text-ink text-[19px] font-semibold">{an.name}</h2>
                    <p className="text-muted mt-0.5 text-[12.5px]">Group: {trail.join(" / ")}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        <Info icon={<BookOpen />} label="Result set" value={`${rs.name}${rs.locked ? "" : " · open"}`} />
                        <Info icon={<Users />} label="Total active students" value={fmt(cohort.active)} />
                        <Info icon={<GraduationCap />} label="Grade pattern" value={an.gradePattern} />
                        <Info icon={<TrendingUp />} label="Year groups" value={cohort.years.length ? `${cohort.years.length} group${cohort.years.length === 1 ? "" : "s"}` : "none"} />
                        <Info icon={<Layers />} label="Aspect pattern" value={`${an.aspectPattern} (${pattern.length} aspect${pattern.length === 1 ? "" : "s"})`} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <span className="eyebrow mr-1">Year groups</span>
                        {cohort.years.length ? (
                            cohort.years.map((y) => (
                                <span key={y} className="bg-primary-soft text-primary rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold">
                                    {ygShort(y)}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted text-[12px]">
                                This analysis covers {an.years ? an.years.map(ygShort).join(", ") : "all year groups"}, outside the current selection
                            </span>
                        )}
                    </div>
                </Panel>

                {/* outcome matrix */}
                <Panel
                    span={12}
                    title={`Aspect analysis outcome · ${here}`}
                    subtitle={
                        rows.length
                            ? `${outcome === "pct" ? "Share of valid results in each band" : "Students in each band"}, ${rs.name}. Underlined bands meet expected.${transpose ? "" : " Select an aspect row to show it in the group table below."}`
                            : noRows
                    }
                >
                    {rows.length === 0 ? (
                        <Empty>{noRows}</Empty>
                    ) : (
                        <MatrixTable
                            first={transpose ? "Band" : "Aspect"}
                            cols={transpose ? rows.map((r) => ({ key: r.aspect, label: aspectOf(r.aspect).name })) : bands.map((b) => ({ key: b.grade, label: b.grade, band: b }))}
                            lines={
                                transpose
                                    ? bands.map((b, i) => ({
                                          key: b.grade,
                                          label: bandLabel(b),
                                          cells: rows.map((r) => ({ text: cellText(outcome, r, i), share: r.banded ? r.bands[i] / r.banded : 0, meets: b.meets })),
                                      }))
                                    : rows.map((r) => ({
                                          key: r.aspect,
                                          label: aspectOf(r.aspect).name,
                                          focus: r.aspect === aspect,
                                          onSelect: () => setAspect(r.aspect),
                                          cells: bands.map((b, i) => ({ text: cellText(outcome, r, i), share: r.banded ? r.bands[i] / r.banded : 0, meets: b.meets })),
                                      }))
                            }
                        />
                    )}
                </Panel>

                {/* distribution donuts */}
                <Panel
                    span={12}
                    title={transpose ? "Aspect distribution by band" : "Band distribution by aspect"}
                    subtitle={
                        transpose
                            ? `For each band of ${an.gradePattern}, how its results split across the aspects, ${rs.name}.`
                            : `How each aspect’s valid results split across ${an.gradePattern}, ${rs.name}. Select a chart to focus that aspect in the group table.`
                    }
                >
                    {rows.length === 0 ? (
                        <Empty>{noRows}</Empty>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {transpose
                                ? bands.map((b, i) => (
                                      <PieCard
                                          key={b.grade}
                                          title={bandLabel(b)}
                                          caption="results in band"
                                          slices={rows.map((r, j) => ({ name: aspectOf(r.aspect).name, v: r.bands[i], color: ASPECT_COLORS[j % ASPECT_COLORS.length] }))}
                                      />
                                  ))
                                : rows.map((r) => (
                                      <PieCard
                                          key={r.aspect}
                                          title={aspectOf(r.aspect).name}
                                          caption="valid results"
                                          focus={r.aspect === aspect}
                                          onSelect={() => setAspect(r.aspect)}
                                          slices={bands.map((b, i) => ({ name: b.grade, v: r.bands[i], color: bandColor(i, bands.length) }))}
                                      />
                                  ))}
                        </div>
                    )}
                </Panel>

                {/* outcome by group */}
                <Panel
                    span={12}
                    title={level === "student" && groups.length === 0 ? `${aspectOf(aspect).name} · ${here}` : `${aspectOf(aspect).name} by ${level} · ${here}`}
                    subtitle={`The level below the current selection; select a row to ${level === "student" ? "open the student" : "drill down"}. ${outcome === "pct" ? "Shares of valid results." : "Counts of students."}`}
                >
                    {!total ? (
                        <Empty>{aspectOf(aspect).name} is not in this analysis for the current selection.</Empty>
                    ) : (
                        <MatrixTable
                            first={level[0].toUpperCase() + level.slice(1)}
                            cols={bands.map((b) => ({ key: b.grade, label: b.grade, band: b }))}
                            lines={[
                                ...groups.map(({ g, r }) => ({
                                    key: g.key,
                                    label: g.label,
                                    onSelect: () => drill(g.key),
                                    cells: bands.map((b, i) => ({ text: cellText(outcome, r, i), share: r.banded ? r.bands[i] / r.banded : 0, meets: b.meets })),
                                })),
                                {
                                    key: "__total",
                                    label: `All in ${here}`,
                                    total: true,
                                    cells: bands.map((b, i) => ({
                                        text: cellText(outcome, total, i),
                                        share: total.banded ? total.bands[i] / total.banded : 0,
                                        meets: b.meets,
                                    })),
                                },
                            ]}
                        />
                    )}
                </Panel>
            </Grid>
        </>
    )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="bg-surface-2 border-line flex min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5">
            <span className="bg-primary-soft text-primary grid size-7 shrink-0 place-items-center rounded-lg [&>svg]:size-3.5">{icon}</span>
            <div className="min-w-0">
                <span className="text-muted block text-[11px]">{label}</span>
                <b className="text-ink block truncate text-[13px] font-semibold" title={value}>
                    {value}
                </b>
            </div>
        </div>
    )
}

interface Line {
    key: string
    label: string
    focus?: boolean
    total?: boolean
    onSelect?: () => void
    cells: { text: string; share: number; meets: boolean }[]
}

function MatrixTable({ first, cols, lines }: { first: string; cols: { key: string; label: string; band?: GradeBand }[]; lines: Line[] }) {
    return (
        <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full border-separate border-spacing-y-1 text-[13px]">
                <thead>
                    <tr>
                        <th scope="col" className="text-muted px-3 pb-1.5 text-left text-[10.5px] font-bold tracking-[.12em] uppercase">
                            {first}
                        </th>
                        {cols.map((c) => (
                            <th
                                key={c.key}
                                scope="col"
                                title={c.band ? (c.band.start != null ? `${c.band.start}–${c.band.end}` : c.band.meets ? "Meets expected" : undefined) : undefined}
                                className={cn(
                                    "text-muted px-2 pb-1.5 text-center text-[11px] font-bold whitespace-nowrap",
                                    c.band?.meets && "text-ink-2 decoration-primary/60 underline decoration-2 underline-offset-4",
                                )}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {lines.map((l) => (
                        <tr
                            key={l.key}
                            tabIndex={l.onSelect ? 0 : undefined}
                            onClick={l.onSelect}
                            onKeyDown={l.onSelect ? onEnter(l.onSelect) : undefined}
                            aria-selected={l.focus || undefined}
                            className={cn("group transition-colors", l.onSelect && "cursor-pointer outline-none")}
                        >
                            <td
                                className={cn(
                                    "rounded-l-xl px-3 py-2.5 font-semibold whitespace-nowrap transition-colors",
                                    l.total ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink group-hover:bg-primary-softer group-focus-visible:bg-primary-softer",
                                    l.focus && "shadow-[inset_3px_0_0_var(--primary)] text-primary",
                                )}
                            >
                                {l.label}
                            </td>
                            {l.cells.map((c, i) => (
                                <td
                                    key={i}
                                    style={shade(c.share)}
                                    className={cn(
                                        "tabular px-2 py-2.5 text-center transition-colors",
                                        !c.share && (l.total ? "bg-primary-soft" : "bg-surface-2"),
                                        l.total && "font-semibold",
                                        c.meets && "font-semibold",
                                        i === l.cells.length - 1 && "rounded-r-xl",
                                    )}
                                >
                                    {c.text}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function PieCard({
    title,
    caption,
    slices,
    focus,
    onSelect,
}: {
    title: string
    caption: string
    slices: Slice[]
    focus?: boolean
    onSelect?: () => void
}) {
    const total = slices.reduce((s, x) => s + x.v, 0)
    return (
        <div
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect}
            onKeyDown={onSelect ? onEnter(onSelect) : undefined}
            className={cn(
                "border-line bg-surface-2 rounded-xl border p-3 transition-all duration-200 outline-none",
                onSelect && "hover:border-line-strong focus-visible:border-primary/50 cursor-pointer hover:-translate-y-0.5",
                focus && "border-primary/50 ring-primary/15 ring-2",
            )}
        >
            <h4 className="text-ink text-[13px] font-semibold">{title}</h4>
            {total ? (
                <Donut height={170} data={slices.filter((s) => s.v > 0)} center={{ value: fmt(total), label: caption }} />
            ) : (
                <div className="grid h-[170px] place-items-center">
                    <div className="border-line text-muted grid size-32 place-items-center rounded-full border-[14px] text-[12px]">0</div>
                </div>
            )}
            <ul className="mt-2 space-y-1 text-[12px]">
                {slices.map((s) => (
                    <li key={s.name} className={cn("flex items-center gap-2", !s.v && "opacity-45")}>
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="text-ink-2 min-w-0 flex-1 truncate">{s.name}</span>
                        <b className="tabular text-ink font-semibold">{fmt(s.v)}</b>
                        <span className="tabular text-muted w-12 text-right">{total ? pct((s.v / total) * 100) : "N/A"}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
