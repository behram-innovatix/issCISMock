import { NW, weekRange, WEEKS } from "@/lib/calendar"
import { avg, ratio, sum } from "@/lib/format"
import type { Tone } from "@/lib/status"
import { sectionOutcomes } from "@/platforms/edu/analytics"
import type { EduDataset } from "@/platforms/edu/data/types"
import {
    COMPETENCIES,
    CURRENT_CYCLE,
    DEPARTMENTS,
    HR_CAT,
    HR_CODES,
    LEAVE_TYPES,
    LOCATIONS,
    MONTHS,
    type Rating,
    ratingOf,
} from "./data/constants"
import type { AppraisalStatus, Employee, HrDataset } from "./data/types"

export interface EmployeeMetrics {
    present: number
    late: number
    sick: number
    annual: number
    emergency: number
    unauth: number
    tot: number
    /** (present + late) ÷ (working days − annual leave) */
    att: number
    absence: number
    lateMins: number
    appraisal?: number
    rating?: Rating
    currentStatus?: AppraisalStatus
    kpi: number
    leaveYtd: number[]
    status: Tone
}

export const latestScore = (e: Employee) => [...e.appraisals].reverse().find((a) => a.overall != null)?.overall

/** Staff status mirrors the student rule: At risk if attendance < 90 or appraisal < 2.75; Watch if < 95 or < 3.4. */
export function hrMetricsFor(e: Employee, w0 = 0): EmployeeMetrics {
    let present = 0,
        late = 0,
        sick = 0,
        annual = 0,
        emergency = 0,
        unauth = 0,
        lateMins = 0
    for (let i = w0 * 5; i < NW * 5; i++) {
        const code = HR_CODES[e.days[i]][0]
        if (code === "P" || code === "T") present++
        else if (code === "L") {
            late++
            lateMins += e.lateMins[i]
        } else if (code === "S") sick++
        else if (code === "A") annual++
        else if (code === "E") emergency++
        else unauth++
    }
    const tot = present + late + sick + annual + emergency + unauth
    const att = ratio(present + late, tot - annual)
    const appraisal = latestScore(e)
    const status: Tone =
        att < 90 || (appraisal != null && appraisal < 2.75) ? "bad" : att < 95 || (appraisal != null && appraisal < 3.4) ? "warn" : "good"
    return {
        present,
        late,
        sick,
        annual,
        emergency,
        unauth,
        tot,
        att,
        absence: ratio(sick + emergency + unauth, tot),
        lateMins,
        appraisal,
        rating: appraisal != null ? ratingOf(appraisal) : undefined,
        currentStatus: e.appraisals.find((a) => a.cycle === CURRENT_CYCLE.id)?.status,
        kpi: avg(e.kpis.map((k) => k.attainment)),
        leaveYtd: LEAVE_TYPES.map((_, t) => sum(e.leaveMonths.map((m) => m[t]))),
        status,
    }
}

export type RoleFilter = "all" | "teaching" | "support"
export interface HrFilters {
    location: string
    dept: string
    role: RoleFilter
    w0: number
}
export const DEFAULT_HR_FILTERS: HrFilters = { location: "all", dept: "all", role: "all", w0: 0 }

export type ScoredEmployee = Employee & { m: EmployeeMetrics }

export function analyseHr(data: HrDataset, f: HrFilters) {
    const list: ScoredEmployee[] = data.employees
        .filter(
            (e) =>
                (f.location === "all" || e.location === f.location) &&
                (f.dept === "all" || e.dept === f.dept) &&
                (f.role === "all" || (f.role === "teaching") === e.teaching),
        )
        .map((e) => ({ ...e, m: hrMetricsFor(e, f.w0) }))
    const n = list.length
    const ms = list.map((e) => e.m)
    const P = sum(ms.map((m) => m.present))
    const L = sum(ms.map((m) => m.late))
    const S = sum(ms.map((m) => m.sick))
    const A = sum(ms.map((m) => m.annual))
    const E = sum(ms.map((m) => m.emergency))
    const U = sum(ms.map((m) => m.unauth))
    const TOT = P + L + S + A + E + U
    const att = ratio(P + L, TOT - A)
    const scored = list.filter((e) => e.m.appraisal != null)
    const avgAppraisal = avg(scored.map((e) => e.m.appraisal!))

    // weekly series + lateness heatmap
    const weeks = weekRange(f.w0).map((w) => {
        let ok = 0,
            late = 0,
            abs = 0,
            al = 0,
            t = 0
        for (const e of list)
            for (let d = 0; d < 5; d++) {
                const c = HR_CAT[e.days[w * 5 + d]]
                const code = HR_CODES[e.days[w * 5 + d]][0]
                t++
                if (c === "present") ok++
                else if (c === "late") {
                    ok++
                    late++
                } else if (code === "A") al++
                else abs++
            }
        return { w, label: WEEKS[w], att: ratio(ok, t - al), late: ratio(late, t), abs: ratio(abs, t) }
    })
    const lateHeat = weekRange(f.w0).map((w) =>
        Array.from({ length: 5 }, (_, d) => {
            let late = 0
            for (const e of list) if (HR_CAT[e.days[w * 5 + d]] === "late") late++
            return ratio(late, n)
        }),
    )

    const groupBy = <K extends string>(key: (e: ScoredEmployee) => K, order: K[], label: (k: K) => string) =>
        order
            .map((k) => {
                const g = list.filter((e) => key(e) === k)
                const gp = sum(g.map((e) => e.m.present + e.m.late))
                const gt = sum(g.map((e) => e.m.tot - e.m.annual))
                const gs = g.filter((e) => e.m.appraisal != null)
                return {
                    key: k,
                    label: label(k),
                    n: g.length,
                    att: ratio(gp, gt),
                    absence: ratio(sum(g.map((e) => e.m.sick + e.m.emergency + e.m.unauth)), sum(g.map((e) => e.m.tot))),
                    appraisal: avg(gs.map((e) => e.m.appraisal!)),
                    kpi: avg(g.map((e) => e.m.kpi)),
                    atRisk: g.filter((e) => e.m.status === "bad").length,
                }
            })
            .filter((r) => r.n > 0)

    const scoreBins = [
        { label: "< 2.5", lo: 0, hi: 2.5 },
        { label: "2.5–3", lo: 2.5, hi: 3 },
        { label: "3–3.5", lo: 3, hi: 3.5 },
        { label: "3.5–4", lo: 3.5, hi: 4 },
        { label: "4–4.5", lo: 4, hi: 4.5 },
        { label: "4.5+", lo: 4.5, hi: 9 },
    ].map((b) => ({ ...b, v: scored.filter((e) => e.m.appraisal! >= b.lo && e.m.appraisal! < b.hi).length }))

    const current = list.map((e) => e.m.currentStatus).filter(Boolean) as AppraisalStatus[]
    const cycleStatus = (["Completed", "Manager review", "Self review", "Not started"] as AppraisalStatus[]).map((s) => ({
        name: s,
        v: current.filter((c) => c === s).length,
    }))

    const latestScores = list.map((e) => [...e.appraisals].reverse().find((a) => a.scores)?.scores).filter(Boolean) as number[][]
    const competencies = COMPETENCIES.map((c, i) => ({ name: c, v: avg(latestScores.map((s) => s[i])) }))

    // 9-box: performance band (rows, high → low) × attendance band (cols)
    const perfBand = (s: number) => (s >= 4 ? 0 : s >= 3.25 ? 1 : 2)
    const attBand = (a: number) => (a >= 95 ? 0 : a >= 90 ? 1 : 2)
    const nineBox = [0, 1, 2].map(() => [0, 0, 0])
    for (const e of scored) nineBox[perfBand(e.m.appraisal!)][attBand(e.m.att)]++

    const leaveByMonth = MONTHS.map((month, mi) => {
        const row: Record<string, number | string> = { month }
        LEAVE_TYPES.forEach((t, ti) => (row[t] = sum(list.map((e) => e.leaveMonths[mi][ti]))))
        return row
    })
    const leaveYtd = LEAVE_TYPES.map((t, ti) => ({ name: t, v: sum(list.map((e) => e.m.leaveYtd[ti])) }))
    const balanceBands = [0, 0, 0, 0] // annual leave remaining: > 75%, 50–75, 25–50, < 25
    for (const e of list) {
        const left = 1 - e.m.leaveYtd[0] / e.entitlement.Annual
        balanceBands[left > 0.75 ? 0 : left > 0.5 ? 1 : left > 0.25 ? 2 : 3]++
    }

    return {
        list,
        n,
        teaching: list.filter((e) => e.teaching).length,
        support: list.filter((e) => !e.teaching).length,
        totals: { P, L, S, A, E, U, TOT },
        att,
        late: ratio(L, TOT),
        absence: ratio(S + E + U, TOT),
        leaveDays: S + A + E,
        lateMinsAvg: L ? sum(ms.map((m) => m.lateMins)) / L : 0,
        avgAppraisal,
        appraised: scored.length,
        atRisk: list.filter((e) => e.m.status === "bad").length,
        watch: list.filter((e) => e.m.status === "warn").length,
        completion: ratio(cycleStatus[0].v, current.length),
        cycleStatus,
        weeks,
        lateHeat,
        byLocation: groupBy(
            (e) => e.location,
            LOCATIONS.map((l) => l.id),
            (k) => LOCATIONS.find((l) => l.id === k)!.short,
        ),
        byDept: groupBy(
            (e) => e.dept,
            DEPARTMENTS.map((d) => d.code),
            (k) => DEPARTMENTS.find((d) => d.code === k)!.name,
        ),
        scoreBins,
        ratings: (["Exceeds", "Meets", "Developing", "Unsatisfactory"] as Rating[]).map((r) => ({
            name: r,
            v: scored.filter((e) => e.m.rating === r).length,
        })),
        competencies,
        nineBox,
        leaveByMonth,
        leaveYtd,
        balanceBands,
        dayMix: [
            { name: "Present", v: P, color: "var(--good)" },
            { name: "Late", v: L, color: "var(--warn)" },
            { name: "On leave", v: S + A + E, color: "var(--auth)" },
            { name: "Unauthorised", v: U, color: "var(--bad)" },
        ],
    }
}
export type HrAnalysis = ReturnType<typeof analyseHr>

export const PERF_BANDS = ["High (4.0+)", "Solid (3.25–4.0)", "Low (< 3.25)"]
export const STAFF_ATT_BANDS = ["95% or more", "90–95%", "Below 90%"]

/** Teacher Impact rows: each teacher's classes (EDU) next to their HR record. */
export function teacherImpact(edu: EduDataset, list: ScoredEmployee[], w0 = 0) {
    return list
        .filter((e) => e.teaching && e.sections.length)
        .map((e) => {
            const o = sectionOutcomes(edu, e.sections, w0)
            return {
                e,
                sections: e.sections.length,
                students: o.students,
                classAtt: o.att,
                net: o.netPerStudent,
                atRisk: o.atRisk,
                atRiskPct: ratio(o.atRisk, o.students),
                appraisal: e.m.appraisal,
            }
        })
}
export type TeacherImpactRow = ReturnType<typeof teacherImpact>[number]
