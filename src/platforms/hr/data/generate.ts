import { dateOf, NW } from "@/lib/calendar"
import { avg } from "@/lib/format"
import { makeRandom } from "@/lib/seed"
import { sectionOutcomes } from "@/platforms/edu/analytics"
import { FIRST_F, FIRST_M, LAST, schoolOf, SCHOOLS } from "@/platforms/edu/data/constants"
import type { EduDataset, Gender, Section } from "@/platforms/edu/data/types"
import { COMPETENCIES, CYCLES, DEPARTMENTS, HR_CODES, LEAVE_TYPES, PRIMARY_SPECIALISTS, SECONDARY_SUBJECTS } from "./constants"
import type { Appraisal, AppraisalStatus, Employee, EmployeeKpi, LeaveRequest } from "./types"

export const HR_SEED = 20261014

const STAFF_NATS: [string, number][] = [
    ["British", 18],
    ["Egyptian", 15],
    ["Jordanian", 12],
    ["Indian", 11],
    ["Qatari", 10],
    ["Filipino", 8],
    ["Pakistani", 7],
    ["Lebanese", 6],
    ["American", 5],
    ["Other", 8],
]
const ROLE_BY_DEPT: Record<string, string> = {
    EY: "Early Years Teacher",
    PRI: "Class Teacher",
    ENG: "English Teacher",
    MAT: "Mathematics Teacher",
    SCI: "Science Teacher",
    ARB: "Arabic & Islamic Studies Teacher",
    HUM: "Humanities Teacher",
    CMP: "Computing & Arts Teacher",
    PE: "PE Teacher",
}
const SCHOOL_SUPPORT: [string, string, number][] = [
    ["LDR", "Principal", 1],
    ["LDR", "Vice Principal", 2],
    ["ADM", "Admissions Officer", 1],
    ["ADM", "Administrative Officer", 3],
    ["FIN", "Accountant", 2],
    ["ITS", "IT Support Specialist", 2],
    ["FAC", "Facilities Supervisor", 1],
    ["FAC", "Maintenance Technician", 3],
    ["SSV", "School Counsellor", 2],
    ["SSV", "School Nurse", 1],
]
const HQ_STAFF: [string, string, number][] = [
    ["LDR", "Director of Education", 1],
    ["LDR", "Chief Operating Officer", 1],
    ["LDR", "Chief Financial Officer", 1],
    ["HRD", "HR Manager", 1],
    ["HRD", "HR Business Partner", 2],
    ["HRD", "Recruitment Specialist", 2],
    ["FIN", "Finance Manager", 1],
    ["FIN", "Payroll Officer", 2],
    ["FIN", "Accountant", 2],
    ["ITS", "IT Manager", 1],
    ["ITS", "Systems Engineer", 2],
    ["ADM", "Executive Assistant", 2],
    ["ADM", "Procurement Officer", 2],
]

/**
 * Builds the HR workforce around the EDU sections:
 *  - every primary section gets its own class teacher (form tutor)
 *  - every secondary section is taught by one teacher per subject department; one of them is form tutor
 *  - behaviour events are re-attributed to a teacher of the student's section
 *  - appraisal scores lean on the teacher's real class outcomes, so Teacher Impact shows a genuine link
 */
export function generateHr(edu: EduDataset): Employee[] {
    const { R, pick, between, weighted } = makeRandom(HR_SEED)
    const employees: Employee[] = []
    const absBaseOf = new Map<number, number>()

    const make = (location: string, dept: string, role: string, gender?: Gender): Employee => {
        const g: Gender =
            gender ?? (location === "S2" ? (R() < 0.75 ? "M" : "F") : location === "S3" ? (R() < 0.88 ? "F" : "M") : R() < 0.5 ? "M" : "F")
        const first = pick(g === "M" ? FIRST_M : FIRST_F)
        const name = `${g === "M" ? "Mr." : "Ms."} ${first} ${pick(LAST)}`
        const teaching = DEPARTMENTS.find((d) => d.code === dept)!.teaching
        const year = weighted([
            [2026, 12],
            [2025, 14],
            [2024, 13],
            [2023, 12],
            [2022, 10],
            [2021, 8],
            [2019, 9],
            [2017, 8],
            [2014, 7],
            [2011, 5],
            [2008, 2],
        ])
        const hireDate = new Date(year, year === 2026 ? 7 : Math.floor(R() * 12), 1 + Math.floor(R() * 26))
        const lead = role.startsWith("Principal") || role.startsWith("Chief") || role.startsWith("Director") || role.endsWith("Manager")
        const e: Employee = {
            id: employees.length + 1,
            name,
            gender: g,
            location,
            dept,
            role,
            teaching,
            grade: lead ? "L" + (1 + Math.floor(R() * 2)) : (teaching ? "T" : "S") + (1 + Math.floor(R() * 4)),
            nat: weighted(STAFF_NATS),
            hireDate,
            days: new Uint8Array(NW * 5),
            lateMins: new Uint8Array(NW * 5),
            leaveMonths: [],
            entitlement: { Annual: teaching ? 10 : 30, Sick: 15 },
            leave: [],
            appraisals: [],
            kpis: [],
            sections: [],
        }
        employees.push(e)
        return e
    }

    // ---------- teachers, linked to sections ----------
    for (const sc of SCHOOLS) {
        const secs = edu.sections.filter((x) => x.school === sc.id)
        const primary = secs.filter((x) => x.stage !== "Secondary")
        const secondary = secs.filter((x) => x.stage === "Secondary")
        for (const x of primary) {
            const dept = x.yg === "NR" || x.yg === "RE" ? "EY" : "PRI"
            const t = make(sc.id, dept, ROLE_BY_DEPT[dept])
            x.formTutorId = t.id
            t.formSection = x.key
            t.sections.push(x.key)
        }
        for (const dept of SECONDARY_SUBJECTS) {
            const needs: Section[] = [...secondary, ...(PRIMARY_SPECIALISTS.includes(dept) ? primary : [])]
            const load = dept === "ENG" || dept === "MAT" || dept === "SCI" ? 4 : 6
            const pool = Array.from({ length: Math.max(1, Math.ceil(needs.length / load)) }, () => make(sc.id, dept, ROLE_BY_DEPT[dept]))
            needs.forEach((x, i) => {
                const t = pool[i % pool.length]
                x.subjectTeacherIds.push(t.id)
                t.sections.push(x.key)
            })
        }
        // secondary form tutors: spread across subject teachers who do not already hold a tutor group
        const free = employees.filter((e) => e.location === sc.id && e.teaching && !e.formSection && SECONDARY_SUBJECTS.includes(e.dept))
        secondary.forEach((x, i) => {
            const t = free[i % free.length]
            x.formTutorId = t.id
            if (!t.formSection) t.formSection = x.key
        })
        for (const [dept, role, count] of SCHOOL_SUPPORT) for (let i = 0; i < count; i++) make(sc.id, dept, role)
    }
    for (const [dept, role, count] of HQ_STAFF) for (let i = 0; i < count; i++) make("HQ", dept, role)

    // ---------- reporting lines ----------
    const principal = (loc: string) => employees.find((e) => e.location === loc && e.role === "Principal")
    const coo = employees.find((e) => e.role === "Chief Operating Officer")!
    for (const e of employees) {
        if (e.location === "HQ") {
            const mgr = employees.find((m) => m.location === "HQ" && m.dept === e.dept && m.role.endsWith("Manager") && m.id !== e.id)
            e.managerId = e.dept === "LDR" ? undefined : (mgr ?? coo).id
        } else if (e.role === "Principal") e.managerId = employees.find((m) => m.role === "Director of Education")!.id
        else {
            const vps = employees.filter((m) => m.location === e.location && m.role === "Vice Principal")
            e.managerId = e.teaching && vps.length ? vps[e.id % vps.length].id : principal(e.location)!.id
        }
    }

    // ---------- re-attribute behaviour events to section teachers ----------
    const secByKey = new Map(edu.sections.map((x) => [x.key, x]))
    for (const st of edu.students) {
        const x = secByKey.get(st.key)!
        const staff = [x.formTutorId, ...x.subjectTeacherIds]
        for (const ev of st.ev) ev.byStaffId = pick(staff)
    }

    // ---------- attendance, lateness and leave ----------
    const SICK = 3,
        ANNUAL = 4,
        EMERG = 5,
        UNAUTH = 6
    for (const e of employees) {
        const absBase = weighted([
            [between(0.004, 0.018), 74],
            [between(0.025, 0.05), 19],
            [between(0.06, 0.12), 7],
        ])
        absBaseOf.set(e.id, absBase)
        const lateBase = weighted([
            [between(0.005, 0.03), 70],
            [between(0.04, 0.09), 24],
            [between(0.1, 0.18), 6],
        ])
        let run = 0
        let runCode = 0
        for (let i = 0; i < NW * 5; i++) {
            if (run > 0) {
                e.days[i] = runCode
                run--
                continue
            }
            const d = i % 5
            const dayF = d === 4 ? 1.3 : d === 0 ? 1.2 : 1
            if (R() < absBase * dayF) {
                runCode = weighted([
                    [SICK, 55],
                    [EMERG, 15],
                    [ANNUAL, e.teaching ? 6 : 18],
                    [UNAUTH, 12],
                ])
                e.days[i] = runCode
                run =
                    runCode === SICK
                        ? weighted([
                              [0, 60],
                              [1, 28],
                              [2, 12],
                          ])
                        : runCode === ANNUAL
                          ? Math.floor(between(1, 5))
                          : 0
                continue
            }
            if (R() < lateBase) {
                e.days[i] = 2
                e.lateMins[i] = Math.round(
                    weighted([
                        [between(5, 15), 65],
                        [between(15, 35), 28],
                        [between(35, 75), 7],
                    ]),
                )
                continue
            }
            e.days[i] = R() < (e.teaching ? 0.015 : 0.025) ? 1 : 0
        }

        // leave ledger Jan–Oct 2026; Aug–Oct come from the term register above
        const months = Array.from({ length: 10 }, () => [0, 0, 0, 0])
        for (let m = 0; m < 7; m++) {
            const termTime = m !== 6 // July is the summer break for teachers
            const scale = e.teaching ? (termTime ? 0.35 : 0) : 1
            if (R() < 0.18 * scale + (e.teaching ? 0 : 0.12)) months[m][0] += Math.round(between(1, e.teaching ? 2 : 6))
            if (R() < (absBase * 8 + 0.06) * (termTime || !e.teaching ? 1 : 0)) months[m][1] += Math.round(between(1, 3))
            if (R() < 0.04) months[m][2] += 1
            if (R() < 0.012) months[m][3] += Math.round(between(1, 4))
        }
        for (let i = 0; i < NW * 5; i++) {
            const dt = dateOf(Math.floor(i / 5), i % 5)
            const m = dt.getMonth()
            if (m < 7 || m > 9) continue
            const c = e.days[i]
            if (c === ANNUAL) months[m][0]++
            else if (c === SICK) months[m][1]++
            else if (c === EMERG) months[m][2]++
        }
        e.leaveMonths = months

        // leave requests: runs of leave days in the term are approved requests, plus a few upcoming
        const reqs: LeaveRequest[] = []
        for (let i = 0; i < NW * 5; i++) {
            const c = e.days[i]
            if (c !== SICK && c !== ANNUAL && c !== EMERG) continue
            let j = i
            while (j + 1 < NW * 5 && e.days[j + 1] === c) j++
            reqs.push({
                type: c === SICK ? "Sick" : c === ANNUAL ? "Annual" : "Emergency",
                from: dateOf(Math.floor(i / 5), i % 5),
                days: j - i + 1,
                status: "Approved",
            })
            i = j
        }
        const upcoming = weighted([
            [0, 55],
            [1, 35],
            [2, 10],
        ])
        for (let k = 0; k < upcoming; k++) {
            reqs.push({
                type: e.teaching
                    ? weighted([
                          ["Annual", 3],
                          ["Emergency", 1],
                      ] as const)
                    : weighted([
                          ["Annual", 8],
                          ["Unpaid", 1],
                      ] as const),
                from: new Date(2026, 9 + Math.floor(R() * 3), 1 + Math.floor(R() * 27)),
                days: Math.round(between(1, e.teaching ? 3 : 8)),
                status: weighted([
                    ["Pending", 6],
                    ["Approved", 3],
                    ["Rejected", 1],
                ] as const),
            })
        }
        e.leave = reqs.sort((a, b) => b.from.getTime() - a.from.getTime())
    }

    // ---------- appraisals + KPIs, anchored to real outcomes ----------
    const outcomes = new Map(employees.filter((e) => e.teaching).map((e) => [e.id, sectionOutcomes(edu, e.sections)]))
    const tAtt = [...outcomes.values()].map((o) => o.att)
    const tNet = [...outcomes.values()].map((o) => o.netPerStudent)
    const z = (v: number, arr: number[]) => {
        const m = avg(arr)
        const sd = Math.sqrt(avg(arr.map((x) => (x - m) ** 2))) || 1
        return (v - m) / sd
    }
    const clamp = (v: number) => Math.max(1, Math.min(5, v))
    const round1 = (v: number) => Math.round(v * 10) / 10

    for (const e of employees) {
        const o = outcomes.get(e.id)
        const noise = between(-1, 1) + between(-1, 1)
        const absPenalty = (absBaseOf.get(e.id)! - 0.02) * 9
        const q = o ? 0.55 * z(o.att, tAtt) + 0.3 * z(o.netPerStudent, tNet) + 0.55 * noise : 0.95 * noise
        const base = 3.62 + 0.42 * q - absPenalty

        const appraisals: Appraisal[] = []
        for (const cycle of CYCLES) {
            const cycleStart =
                cycle.id === "2024-25" ? new Date(2024, 8, 1) : cycle.id === "2025-26" ? new Date(2025, 8, 1) : new Date(2026, 8, 1)
            const eligible = cycle.id === "2026-27-mid" ? e.hireDate < new Date(2026, 8, 15) : e.hireDate < cycleStart
            if (!eligible) continue
            const drift =
                cycle.id === "2024-25" ? between(-0.35, 0.15) : cycle.id === "2025-26" ? between(-0.2, 0.15) : between(-0.12, 0.18)
            let status: AppraisalStatus = "Completed"
            if (cycle.id === "2026-27-mid") {
                const recent = e.hireDate > new Date(2026, 0, 1)
                status = weighted([
                    ["Completed", recent ? 20 : 58],
                    ["Manager review", 18],
                    ["Self review", 14],
                    ["Not started", recent ? 30 : 10],
                ] as const)
            }
            const a: Appraisal = { cycle: cycle.id, label: cycle.label, status, reviewerId: e.managerId }
            if (status === "Completed" || status === "Manager review") {
                const scores = COMPETENCIES.map((_, ci) => {
                    const lean = ci === 1 && o ? 0.25 * z(o.att, tAtt) : ci === 2 ? -absPenalty * 0.6 : 0
                    return round1(clamp(base + drift + lean + between(-0.45, 0.45)))
                })
                if (status === "Completed") {
                    a.scores = scores
                    a.overall = Math.round(avg(scores) * 100) / 100
                }
            }
            appraisals.push(a)
        }
        e.appraisals = appraisals

        const k = (name: string, target: number, actual: number, unit: EmployeeKpi["unit"], lowerBetter = false): EmployeeKpi => ({
            name,
            target,
            actual: Math.round(actual * 10) / 10,
            unit,
            attainment: Math.min(120, lowerBetter ? (target / Math.max(actual, 0.1)) * 100 : (actual / target) * 100),
        })
        const lift = Math.max(-1.2, Math.min(1.2, q / 2))
        e.kpis = o
            ? [
                  k("Class attendance", 95, o.att, "%"),
                  k("Lessons observed good or better", 80, Math.max(35, Math.min(100, 76 + lift * 18 + between(-8, 8))), "%"),
                  k("CPD hours (year to date)", 30, Math.max(2, 22 + lift * 8 + between(-8, 10)), "h"),
                  k("Reports submitted on time", 100, Math.max(60, Math.min(100, 93 + lift * 6 + between(-6, 7))), "%"),
              ]
            : [
                  k("Tasks closed within SLA", 90, Math.max(50, Math.min(100, 86 + lift * 9 + between(-7, 7))), "%"),
                  k("CPD hours (year to date)", 20, Math.max(1, 14 + lift * 6 + between(-6, 8)), "h"),
                  k("Stakeholder satisfaction", 4, Math.max(2.4, Math.min(5, 3.9 + lift * 0.45 + between(-0.3, 0.3))), "/5"),
              ]
    }

    return employees
}

export const HR_CODE_INDEX = Object.fromEntries(HR_CODES.map((c, i) => [c[0], i]))
export const LEAVE_INDEX = Object.fromEntries(LEAVE_TYPES.map((t, i) => [t, i]))
export const schoolName = (id: string) => (id === "HQ" ? "Group Head Office" : schoolOf(id).name)
