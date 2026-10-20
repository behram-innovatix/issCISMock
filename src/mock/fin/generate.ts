import { AS_OF } from "@/lib/calendar"
import { sum } from "@/lib/format"
import { metricsFor } from "@/platforms/edu/analytics"
import { LOCATIONS } from "@/platforms/hr/data/constants"
import type { Employee } from "@/platforms/hr/data/types"
import {
    BUDGET_CATEGORIES,
    CURRENT_TERM,
    type DiscountId,
    discountOf,
    EOSB_RATE,
    GRADE_PAY,
    monthShare,
    NEW_JOINER_BILLING,
    NM,
    type PayerProfile,
    type PaymentMethod,
    RESOURCE_FEE,
    SCHOOL_PREMIUM,
    TERMS,
    TRANSPORT_FEE,
    TUITION,
} from "@/platforms/fin/data/constants"
import type {
    BudgetLine,
    FeeAccount,
    FinDataset,
    IncomeLine,
    Instalment,
    Invoice,
    Payment,
    PayrollRecord,
} from "@/platforms/fin/data/types"
import type { MockEdu } from "../edu/generate"
import { makeRandom } from "../seed"

export const FIN_SEED = 20261018

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.round(n))
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

/** Annual running cost per student by budget category (schools), and fixed annual costs for the head office. */
const PER_STUDENT: Record<string, number> = { FAC: 5200, RES: 950, ITS: 700, MKT: 420, ADM: 900 }
const PER_RIDER = 3600
const HQ_COST: Record<string, number> = { FAC: 1_900_000, ITS: 2_800_000, MKT: 1_600_000, ADM: 4_400_000 }
const ACTIVITY_PHASING = [0.8, 1, 1.6, 1.2, 0.9, 0.4, 0, 0.2, 0.7, 1.1, 1.6, 1.5]

/**
 * Finance is generated last, from its own seed, so the EDU and HR data stay untouched:
 *  - one fee account per EDU student, billed for the three terms that fall in FY 2026; payment behaviour
 *    leans on the student's EDU status (families of at-risk students are more often in arrears)
 *  - payroll comes from each HR employee's grade, joining date and unpaid leave
 *  - salaries actuals in the budget are the payroll; other categories are phased with realistic variance
 */
export function generateFin(edu: MockEdu, employees: Employee[]): Omit<FinDataset, "meta"> {
    const { R, between, weighted } = makeRandom(FIN_SEED)
    const method = () =>
        weighted<PaymentMethod>([
            ["Bank transfer", 50],
            ["Card", 30],
            ["Cheque", 14],
            ["Cash", 6],
        ])

    // ---------- fee accounts ----------
    const accounts: FeeAccount[] = edu.students.map((st) => {
        const risk = metricsFor(st).status
        const d = weighted<DiscountId | "none">([
            ["none", 84],
            ["sibling", 11],
            ["staff", 3],
            ["merit", 1.6],
            ["full", 0.4],
        ])
        const discount = d === "none" ? undefined : d
        const profile = weighted<PayerProfile>([
            ["prompt", risk === "bad" ? 36 : 58],
            ["late", 22],
            ["instalments", 13],
            ["arrears", risk === "bad" ? 22 : 6],
        ])
        const transport = R() < 0.38
        const newJoiner = st.yg === "NR" || R() < 0.07

        const invoices: Invoice[] = []
        for (const term of TERMS) {
            if (newJoiner && term !== CURRENT_TERM) continue
            const current = term === CURRENT_TERM
            const { issued, due } = current && newJoiner ? NEW_JOINER_BILLING : term
            const tuition = Math.round((TUITION[st.stage] * SCHOOL_PREMIUM[st.school] * term.share) / 10) * 10
            const lines = {
                tuition,
                resources: Math.round(RESOURCE_FEE[st.stage] * term.share),
                transport: transport ? Math.round(TRANSPORT_FEE * term.share) : 0,
            }
            const disc = discount ? Math.round(tuition * discountOf(discount).rate) : 0
            const total = lines.tuition + lines.resources + lines.transport - disc
            const instalments: Instalment[] =
                profile === "instalments"
                    ? [0, 30, 60].map((o, i) => ({
                          due: addDays(due, o),
                          amount: i < 2 ? Math.round(total / 3) : total - 2 * Math.round(total / 3),
                      }))
                    : [{ due, amount: total }]

            const payments: Payment[] = []
            const pay = (date: Date, amount: number) => amount > 0 && payments.push({ date, amount, method: method() })
            const window = daysBetween(issued, due)
            if (total > 0) {
                if (profile === "prompt") pay(addDays(issued, between(1, window + 3)), total)
                else if (profile === "late") pay(addDays(due, between(3, 40)), total)
                else if (profile === "instalments") {
                    // some plans fall behind on this term after the first instalment or two
                    const kept = current && R() < 0.2 ? 1 + Math.floor(R() * 2) : 3
                    instalments.slice(0, kept).forEach((ins) => pay(addDays(ins.due, between(-6, R() < 0.25 ? 25 : 5)), ins.amount))
                } else {
                    // arrears: part payments, and older terms are sometimes settled in the end
                    let left = total
                    const chunks = current ? Math.floor(R() * 2) : 1 + Math.floor(R() * 3)
                    for (let c = 0; c < chunks && left > 0; c++) {
                        const amt = Math.min(left, Math.round((total * between(0.15, 0.45)) / 10) * 10)
                        pay(addDays(due, between(8, current ? 45 : 140)), amt)
                        left -= amt
                    }
                    if (!current && left > 0 && R() < 0.45) pay(addDays(due, between(60, 160)), left)
                }
            }
            invoices.push({
                term: term.id,
                issued,
                lines,
                discount: disc,
                total,
                instalments,
                payments: payments.filter((p) => p.date <= AS_OF).sort((a, b) => a.date.getTime() - b.date.getTime()),
            })
        }
        return {
            id: st.id,
            name: st.name,
            school: st.school,
            stage: st.stage,
            yg: st.yg,
            sec: st.sec,
            transport,
            discount,
            profile,
            invoices,
        }
    })

    // ---------- payroll ----------
    const payroll: PayrollRecord[] = employees.map((e) => {
        const [b, h, t] = GRADE_PAY[e.grade]
        const j = between(0.94, 1.08)
        const basic = Math.round((b * j) / 50) * 50
        const housing = Math.round((h * j) / 50) * 50
        const months = Array.from({ length: NM }, (_, m) => {
            const daysIn = new Date(2026, m + 1, 0).getDate()
            const end = new Date(2026, m, daysIn)
            if (e.hireDate > end) return 0
            const frac = e.hireDate.getFullYear() === 2026 && e.hireDate.getMonth() === m ? (daysIn - e.hireDate.getDate() + 1) / daysIn : 1
            const unpaid = e.leaveMonths[m]?.[3] ?? 0
            return Math.round((basic + housing + t) * frac - (unpaid * basic) / 30)
        })
        return {
            id: e.id,
            name: e.name,
            role: e.role,
            location: e.location,
            dept: e.dept,
            teaching: e.teaching,
            grade: e.grade,
            hireDate: e.hireDate,
            basic,
            housing,
            transport: t,
            months,
        }
    })

    // ---------- budget ----------
    const students = (loc: string) => accounts.filter((a) => a.school === loc).length
    const riders = (loc: string) => accounts.filter((a) => a.school === loc && a.transport).length
    const nonSalary = LOCATIONS.flatMap((l) =>
        BUDGET_CATEGORIES.filter((c) => c.code !== "SAL" && (l.id !== "HQ" || HQ_COST[c.code])).map((c) => `${l.id}:${c.code}`),
    )
    const overruns = new Set<string>()
    while (overruns.size < 3) overruns.add(nonSalary[Math.floor(R() * nonSalary.length)])

    const budget: BudgetLine[] = []
    for (const l of LOCATIONS) {
        const staff = payroll.filter((p) => p.location === l.id)
        // full month cost (gross + gratuity accrual) per month, before the October month-to-date cut
        const salaryCost = (m: number) => sum(staff.map((p) => (p.months[m] ? p.months[m] + p.basic * EOSB_RATE : 0)))
        for (const c of BUDGET_CATEGORIES) {
            if (c.code === "SAL") {
                const jit = between(0.99, 1.02)
                const full = Array.from({ length: 12 }, (_, m) => salaryCost(Math.min(m, NM - 1)) * jit * between(0.995, 1.01))
                budget.push({
                    location: l.id,
                    category: c.code,
                    annual: Math.round(sum(full)),
                    budget: full.map(Math.round),
                    actual: Array.from({ length: NM }, (_, m) => Math.round(salaryCost(m) * monthShare(m))),
                })
                continue
            }
            const base =
                l.id === "HQ"
                    ? (HQ_COST[c.code] ?? 0)
                    : c.code === "TRN"
                      ? riders(l.id) * PER_RIDER
                      : students(l.id) * (PER_STUDENT[c.code] ?? 0)
            if (!base) continue
            const annual = Math.round((base * between(0.95, 1.05)) / 1000) * 1000
            const weights = sum(c.phasing)
            const months = c.phasing.map((w) => (annual * w) / weights)
            const f = overruns.has(`${l.id}:${c.code}`) ? between(1.09, 1.18) : between(0.93, 1.04)
            budget.push({
                location: l.id,
                category: c.code,
                annual,
                budget: months.map(Math.round),
                actual: Array.from({ length: NM }, (_, m) => Math.round(months[m] * f * between(0.9, 1.1) * monthShare(m))),
            })
        }
    }

    // ---------- non-fee income ----------
    const income: IncomeLine[] = []
    const phaseSum = sum(ACTIVITY_PHASING)
    for (const l of LOCATIONS) {
        const act = l.id === "HQ" ? 0 : students(l.id) * 650
        const oth = l.id === "HQ" ? 1_200_000 : 180_000 + students(l.id) * 40
        if (act)
            income.push({
                location: l.id,
                stream: "ACT",
                months: Array.from({ length: NM }, (_, m) =>
                    Math.round(((act * ACTIVITY_PHASING[m]) / phaseSum) * between(0.8, 1.2) * monthShare(m)),
                ),
            })
        income.push({
            location: l.id,
            stream: "OTH",
            months: Array.from({ length: NM }, (_, m) => Math.round((oth / 12) * between(0.7, 1.3) * monthShare(m))),
        })
    }

    return { accounts, payroll, budget, income, openingCash: 21_500_000 }
}
