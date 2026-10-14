import type { EduFilters } from "./analytics"
import { ASPECT_PATTERNS, type AspectAnalysis, type AssessmentValue, GRADE_PATTERNS, type GradeBand } from "./data/aspects"
import { schoolOf, secName, type Stage, STAGES, YG_ORDER, ygName } from "./data/constants"
import type { Student } from "./data/types"

/** Band counts for one aspect of a saved analysis (port of the dashboard's asp_matrix row). */
export interface AspectRow {
    aspect: string
    expected: number
    banded: number
    missing: number
    invalid: number
    unbanded: number
    meets: number
    /** count per band, in grade-pattern order */
    bands: number[]
    meetsShare: number | null
}

export type ValueIndex = Map<string, AssessmentValue>
export const valueKey = (studentId: number, resultSet: string, aspect: string) => `${studentId}|${resultSet}|${aspect}`
export const indexValues = (values: AssessmentValue[]): ValueIndex =>
    new Map(values.map((v) => [valueKey(v.studentId, v.resultSet, v.aspect), v]))

export const bandsOf = (an: AspectAnalysis) => GRADE_PATTERNS[an.gradePattern]
export const aspectsOf = (an: AspectAnalysis) => ASPECT_PATTERNS[an.aspectPattern]
export const inAnalysis = (an: AspectAnalysis, st: Student) => !an.years || an.years.includes(st.yg)

/** Numeric patterns band by range (a value falls in the last band it reaches); grade patterns match by label. */
export function bandOf(bands: GradeBand[], v: AssessmentValue): GradeBand | null {
    const numeric = bands.length > 0 && bands.every((b) => b.start != null)
    if (!numeric) return bands.find((b) => b.grade === v.raw.trim()) ?? null
    if (v.value == null || v.value > bands[bands.length - 1].end!) return null
    let hit: GradeBand | null = null
    for (const b of bands) if (v.value >= b.start!) hit = b
    return hit
}

/** Tally one aspect for a set of students; null when none of them records it. */
export function tallyAspect(students: Student[], idx: ValueIndex, an: AspectAnalysis, aspect: string): AspectRow | null {
    const bands = bandsOf(an)
    const row: AspectRow = { aspect, expected: 0, banded: 0, missing: 0, invalid: 0, unbanded: 0, meets: 0, bands: bands.map(() => 0), meetsShare: null }
    for (const st of students) {
        if (!inAnalysis(an, st)) continue
        const v = idx.get(valueKey(st.id, an.resultSet, aspect))
        if (!v) continue
        row.expected++
        if (v.status === "missing") row.missing++
        else if (v.status === "invalid") row.invalid++
        else {
            const b = bandOf(bands, v)
            if (!b) row.unbanded++
            else {
                row.banded++
                row.bands[b.order - 1]++
                if (b.meets) row.meets++
            }
        }
    }
    if (!row.expected) return null
    row.meetsShare = row.banded ? row.meets / row.banded : null
    return row
}

/** One row per aspect in the analysis's pattern that the students record. */
export const aspectMatrix = (students: Student[], idx: ValueIndex, an: AspectAnalysis) =>
    aspectsOf(an)
        .map((id) => tallyAspect(students, idx, an, id))
        .filter((r): r is AspectRow => r !== null)

/** Students in the analysis's year groups (port of asp_cohort). Every enrolled CIS student is active. */
export function analysisCohort(students: Student[], an: AspectAnalysis) {
    const inScope = students.filter((st) => inAnalysis(an, st))
    const years = [...new Set(inScope.map((s) => s.yg))].sort((a, b) => YG_ORDER[a] - YG_ORDER[b])
    return { active: inScope.length, years }
}

export type GroupLevel = "school" | "stage" | "year group" | "section" | "student"

export interface Group {
    key: string
    label: string
    students: Student[]
}

/** The level below the current filter selection: the first of school → stage → year group → section left open. */
export function childLevel(f: EduFilters): GroupLevel {
    if (f.school === "all") return "school"
    if (f.stage === "all") return "stage"
    if (f.yg === "all") return "year group"
    if (f.sec === "all") return "section"
    return "student"
}

export function childGroups(students: Student[], level: GroupLevel): Group[] {
    const keyOf = (s: Student) =>
        level === "school" ? s.school : level === "stage" ? s.stage : level === "year group" ? s.yg : level === "section" ? s.sec : String(s.id)
    const map = new Map<string, Group>()
    for (const s of students) {
        const k = keyOf(s)
        let g = map.get(k)
        if (!g) {
            const label =
                level === "school"
                    ? schoolOf(s.school).name
                    : level === "stage"
                      ? s.stage
                      : level === "year group"
                        ? ygName(s.yg)
                        : level === "section"
                          ? `Section ${secName(s.yg, s.sec)}`
                          : s.name
            g = { key: k, label, students: [] }
            map.set(k, g)
        }
        g.students.push(s)
    }
    const groups = [...map.values()]
    if (level === "year group") return groups.sort((a, b) => YG_ORDER[a.key] - YG_ORDER[b.key])
    if (level === "school") return groups.sort((a, b) => a.key.localeCompare(b.key))
    if (level === "stage") return groups.sort((a, b) => STAGES.indexOf(a.key as Stage) - STAGES.indexOf(b.key as Stage))
    return groups.sort((a, b) => a.label.localeCompare(b.label))
}

/** "All schools / Al Jazeera Academy / Junior / Year 4 / 4B" style trail for the current selection. */
export function selectionTrail(f: EduFilters): string[] {
    const t = [f.school === "all" ? "All schools" : schoolOf(f.school).name]
    if (f.stage !== "all") t.push(f.stage)
    if (f.yg !== "all") t.push(ygName(f.yg))
    if (f.yg !== "all" && f.sec !== "all") t.push(secName(f.yg, f.sec))
    return t
}
