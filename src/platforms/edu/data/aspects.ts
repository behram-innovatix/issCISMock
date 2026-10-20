// Assessment ("aspect") reference data and results, modelled on the aspect tables of the
// Student Performance dashboard (aspects, result_sets, grade_pattern_elements,
// aspect_pattern_elements, aspect_analyses). Year groups are mapped onto the CIS schools.
// Results use their own seed so the EDU generator's RNG stream (and its numbers) is untouched.
import { makeRandom } from "@/mock/seed"
import { metricsFor } from "../analytics"
import type { Student } from "./types"

export type AspectType = "numeric" | "grade" | "text"

export interface Aspect {
    id: string
    name: string
    heading: string
    type: AspectType
    min?: number
    max?: number
    /** grade pattern used to validate grade-type values */
    gradeSet?: string
    /** year-group codes this aspect is recorded for; null = all */
    years: string[] | null
}

export interface ResultSet {
    id: string
    name: string
    order: number
    locked: boolean
}

export interface GradeBand {
    grade: string
    start: number | null
    end: number | null
    order: number
    meets: boolean
}

export interface AspectAnalysis {
    id: string
    name: string
    resultSet: string
    gradePattern: string
    aspectPattern: string
    /** year-group codes in scope; null = all */
    years: string[] | null
    order: number
}

export type ValueStatus = "valid" | "missing" | "invalid"

export interface AssessmentValue {
    studentId: string
    resultSet: string
    aspect: string
    raw: string
    /** parsed number for numeric aspects */
    value: number | null
    status: ValueStatus
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i).padStart(2, "0"))

export const ASPECTS: Aspect[] = [
    { id: "ASP-ENG", name: "English", heading: "Eng %", type: "numeric", min: 0, max: 100, years: range(1, 13) },
    { id: "ASP-MAT", name: "Maths", heading: "Maths %", type: "numeric", min: 0, max: 100, years: range(1, 13) },
    { id: "ASP-SCI", name: "Science", heading: "Sci %", type: "numeric", min: 0, max: 100, years: range(3, 13) },
    { id: "ASP-RDG", name: "Reading level", heading: "Reading", type: "grade", gradeSet: "Reading levels", years: range(1, 6) },
    { id: "ASP-CMT", name: "Teacher comment", heading: "Comment", type: "text", years: null },
]
export const aspectOf = (id: string) => ASPECTS.find((a) => a.id === id)!

export const RESULT_SETS: ResultSet[] = [
    { id: "PY", name: "Prior year (2025–26)", order: 1, locked: true },
    { id: "BL", name: "Baseline", order: 2, locked: true },
    { id: "MT", name: "Mid-term", order: 3, locked: false },
]
export const resultSetOf = (id: string) => RESULT_SETS.find((r) => r.id === id)!

const nb = (rows: [string, number, number, boolean][]): GradeBand[] =>
    rows.map(([grade, start, end, meets], i) => ({ grade, start, end, order: i + 1, meets }))

export const GRADE_PATTERNS: Record<string, GradeBand[]> = {
    "Attainment bands": nb([
        ["Below", 0, 39, false],
        ["Working towards", 40, 59, false],
        ["Expected", 60, 79, true],
        ["Greater depth", 80, 100, true],
    ]),
    "Score bands (10-point)": nb(
        Array.from({ length: 10 }, (_, i) => [`${i ? i * 10 + 1 : 0}–${(i + 1) * 10}`, i ? i * 10 + 1 : 0, (i + 1) * 10, i >= 6]),
    ),
    "Reading levels": ["Emerging", "Developing", "Secure", "Mastery"].map((grade, i) => ({
        grade,
        start: null,
        end: null,
        order: i + 1,
        meets: i >= 2,
    })),
    "Attainment 9-1": nb(["U", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((g, i) => [g, i * 10, i === 9 ? 100 : i * 10 + 9, i >= 4])),
}

export const ASPECT_PATTERNS: Record<string, string[]> = {
    "Core Subjects": ["ASP-ENG", "ASP-MAT", "ASP-SCI"],
    Reading: ["ASP-RDG"],
    "Maths & Science": ["ASP-MAT", "ASP-SCI"],
}

export const ASPECT_ANALYSES: AspectAnalysis[] = [
    {
        id: "AA-01",
        name: "Core Attainment Analysis",
        resultSet: "MT",
        gradePattern: "Attainment bands",
        aspectPattern: "Core Subjects",
        years: null,
        order: 1,
    },
    {
        id: "AA-02",
        name: "Core Exam Score Bands",
        resultSet: "MT",
        gradePattern: "Score bands (10-point)",
        aspectPattern: "Core Subjects",
        years: null,
        order: 2,
    },
    {
        id: "AA-03",
        name: "Baseline Check Point",
        resultSet: "BL",
        gradePattern: "Score bands (10-point)",
        aspectPattern: "Core Subjects",
        years: null,
        order: 3,
    },
    {
        id: "AA-04",
        name: "Primary Reading Levels",
        resultSet: "MT",
        gradePattern: "Reading levels",
        aspectPattern: "Reading",
        years: range(3, 6),
        order: 4,
    },
    {
        id: "AA-05",
        name: "Secondary Grade Analysis (9–1)",
        resultSet: "MT",
        gradePattern: "Attainment 9-1",
        aspectPattern: "Maths & Science",
        years: range(7, 11),
        order: 5,
    },
    {
        id: "AA-06",
        name: "Prior-year Baseline",
        resultSet: "PY",
        gradePattern: "Attainment bands",
        aspectPattern: "Core Subjects",
        years: null,
        order: 6,
    },
]

export const ASPECT_SEED = 20261014

const COMMENTS = [
    "Working hard in class",
    "Good progress this term",
    "Needs to focus on homework",
    "Participates well",
    "Should read more at home",
    "Consistent effort",
]
const READING = GRADE_PATTERNS["Reading levels"].map((b) => b.grade)

/** One value per student × result set × aspect the student's year group records. */
export function generateAssessments(students: Student[]): AssessmentValue[] {
    const { R, pick, between } = makeRandom(ASPECT_SEED)
    const out: AssessmentValue[] = []
    for (const st of students) {
        // latent ability, nudged by attendance so results line up with the other modules
        const att = metricsFor(st).att
        const ability = Math.max(15, Math.min(95, between(35, 85) + (att - 94) * 1.4))
        const flair = ASPECTS.map(() => between(-12, 12))
        for (const rs of RESULT_SETS) {
            const drift = (rs.order - 2) * between(-1, 4)
            ASPECTS.forEach((asp, ai) => {
                if (asp.years && !asp.years.includes(st.yg)) return
                const base = { studentId: st.id, resultSet: rs.id, aspect: asp.id }
                const r = R()
                // the open result set still has gaps; locked sets are nearly complete
                if (r < (rs.locked ? 0.012 : 0.05)) return out.push({ ...base, raw: "", value: null, status: "missing" })
                if (r > 0.995 && asp.type !== "text")
                    return out.push({ ...base, raw: asp.type === "numeric" ? "105" : "Absent", value: null, status: "invalid" })
                const score = Math.max(0, Math.min(100, Math.round(ability + flair[ai] + drift + between(-8, 8))))
                if (asp.type === "numeric") out.push({ ...base, raw: String(score), value: score, status: "valid" })
                else if (asp.type === "grade")
                    out.push({ ...base, raw: READING[Math.min(3, Math.floor(score / 25))], value: null, status: "valid" })
                else out.push({ ...base, raw: pick(COMMENTS), value: null, status: "valid" })
            })
        }
    }
    return out
}
