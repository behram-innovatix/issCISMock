import { dateOf, NW, WEEKS } from "@/lib/calendar"
import { AS_OF } from "@/lib/calendar"
import { avg, ratio, sum } from "@/lib/format"
import { type Stage, STAGES, YGS, ygName } from "@/platforms/edu/data/constants"
import { DEPARTMENTS, LOCATIONS } from "@/platforms/hr/data/constants"
import {
    type AccountStatus,
    accountStatusOf,
    AGEING,
    ageingBucket,
    BUDGET_CATEGORIES,
    COLLECTION_TARGET,
    CURRENT_TERM,
    DISCOUNTS,
    EOSB_RATE,
    FIN_MONTHS,
    LAST_CLOSED,
    type MonthKey,
    monthRange,
    monthShare,
    NM,
    PAYMENT_METHODS,
    REVENUE_STREAMS,
    type StreamCode,
    termOf,
} from "./data/constants"
import type { BudgetLine, FeeAccount, FinDataset, Invoice, PayrollRecord } from "./data/types"

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)
export const FEE_SCHOOLS = LOCATIONS.filter((l) => l.id !== "HQ")
/** Month axis label; October (month to date) is called out in panel subtitles. */
export const monthLabel = (m: number) => FIN_MONTHS[m]

/* ---------- fee accounts ---------- */

export const invoicePaid = (inv: Invoice) => sum(inv.payments.map((p) => p.amount))

export interface AccountMetrics {
    /** invoices issued in the period: before and after discount */
    gross: number
    discount: number
    billed: number
    /** paid against invoices issued in the period */
    paid: number
    /** open balance across every invoice */
    balance: number
    overdue: number
    daysOverdue: number
    /** open balance per AGEING bucket */
    ageing: number[]
    /** unpaid on terms before the current one */
    prior: number
    status: AccountStatus
    lastPayment?: Date
}

export function accountMetricsFor(a: FeeAccount, m0 = 0): AccountMetrics {
    let gross = 0,
        discount = 0,
        billed = 0,
        paid = 0,
        balance = 0,
        overdue = 0,
        prior = 0
    let oldest: Date | undefined
    let lastPayment: Date | undefined
    const ageing = AGEING.map(() => 0)
    for (const inv of a.invoices) {
        const p = invoicePaid(inv)
        if (termOf(inv.term).month >= m0) {
            gross += inv.total + inv.discount
            discount += inv.discount
            billed += inv.total
            paid += p
        }
        balance += inv.total - p
        if (inv.term !== CURRENT_TERM.id) prior += inv.total - p
        // payments settle the earliest instalment first
        let covered = p
        for (const ins of inv.instalments) {
            const open = Math.max(0, ins.amount - covered)
            covered = Math.max(0, covered - ins.amount)
            if (open <= 0) continue
            const days = daysBetween(ins.due, AS_OF)
            ageing[ageingBucket(days)] += open
            if (days > 0) {
                overdue += open
                if (!oldest || ins.due < oldest) oldest = ins.due
            }
        }
        for (const x of inv.payments) if (!lastPayment || x.date > lastPayment) lastPayment = x.date
    }
    const daysOverdue = oldest ? daysBetween(oldest, AS_OF) : 0
    return {
        gross,
        discount,
        billed,
        paid,
        balance,
        overdue,
        daysOverdue,
        ageing,
        prior,
        status: accountStatusOf(balance, overdue, daysOverdue, prior),
        lastPayment,
    }
}

export type ScoredAccount = FeeAccount & { m: AccountMetrics }

/* ---------- payroll ---------- */

/** A month's employment cost, split into its parts. October is month to date. */
export function payrollMonth(p: PayrollRecord, m: number) {
    const gross = p.months[m]
    if (!gross) return { basic: 0, housing: 0, allowances: 0, eosb: 0, total: 0 }
    const pkg = p.basic + p.housing + p.transport
    const s = monthShare(m)
    const basic = ((gross * p.basic) / pkg) * s
    const housing = ((gross * p.housing) / pkg) * s
    const allowances = ((gross * p.transport) / pkg) * s
    const eosb = p.basic * EOSB_RATE * s
    return { basic, housing, allowances, eosb, total: basic + housing + allowances + eosb }
}

/* ---------- roll-up ---------- */

export interface FinFilters {
    location: string
    stage: "all" | Stage
    m0: MonthKey
}
export const DEFAULT_FIN_FILTERS: FinFilters = { location: "all", stage: "all", m0: 0 }

const lineBudget = (l: BudgetLine, months: number[]) => sum(months.map((m) => l.budget[m] * monthShare(m)))
const lineActual = (l: BudgetLine, months: number[]) => sum(months.map((m) => l.actual[m]))

export function analyseFin(data: FinDataset, f: FinFilters) {
    const inLoc = (loc: string) => f.location === "all" || loc === f.location
    const months = monthRange(f.m0)
    const ytd = monthRange(0)

    // ----- fees -----
    const locAccounts = data.accounts.filter((a) => inLoc(a.school))
    const list: ScoredAccount[] = locAccounts
        .filter((a) => f.stage === "all" || a.stage === f.stage)
        .map((a) => ({ ...a, m: accountMetricsFor(a, f.m0) }))
    const n = list.length
    const feeTotals = (g: ScoredAccount[]) => {
        const billed = sum(g.map((a) => a.m.billed))
        const collected = sum(g.map((a) => a.m.paid))
        return {
            n: g.length,
            billed,
            collected,
            rate: ratio(collected, billed),
            outstanding: sum(g.map((a) => a.m.balance)),
            overdue: sum(g.map((a) => a.m.overdue)),
            arrears: g.filter((a) => a.m.status === "arrears").length,
        }
    }
    const totals = feeTotals(list)
    const statusCount: Record<AccountStatus, number> = { paid: 0, current: 0, overdue: 0, arrears: 0 }
    for (const a of list) statusCount[a.m.status]++
    const ageing = AGEING.map((label, i) => ({
        label,
        v: sum(list.map((a) => a.m.ageing[i])),
        n: list.filter((a) => a.m.ageing[i] > 0).length,
    }))

    // current-term collection curve, by school week
    const current = list.flatMap((a) => a.invoices.filter((i) => i.term === CURRENT_TERM.id))
    const currentBilled = sum(current.map((i) => i.total))
    const curve = WEEKS.map((label, w) => {
        const end = dateOf(w, 4)
        const got = sum(current.flatMap((i) => i.payments.filter((p) => p.date <= end).map((p) => p.amount)))
        return { label, collected: ratio(got, currentBilled), target: COLLECTION_TARGET[w] }
    })
    const currentCollected = curve[NW - 1].collected

    const byLocation = FEE_SCHOOLS.map((l) => ({ key: l.id, label: l.short, ...feeTotals(list.filter((a) => a.school === l.id)) })).filter(
        (r) => r.n > 0,
    )
    const byStage = STAGES.map((s) => ({ key: s, label: s, ...feeTotals(list.filter((a) => a.stage === s)) })).filter((r) => r.n > 0)
    const byYg = YGS.map(([yg]) => ({ key: yg, label: ygName(yg), ...feeTotals(list.filter((a) => a.yg === yg)) })).filter((r) => r.n > 0)
    const schoolStage = FEE_SCHOOLS.filter((l) => inLoc(l.id)).map((l) => ({
        key: l.id,
        label: l.short,
        cells: STAGES.map((s) => feeTotals(list.filter((a) => a.school === l.id && a.stage === s))),
    }))
    const discounts = DISCOUNTS.map((d) => {
        const g = list.filter((a) => a.discount === d.id)
        return { name: d.label, color: d.color, n: g.length, v: sum(g.map((a) => a.m.discount)) }
    })
    const methods = PAYMENT_METHODS.map((name) => ({
        name,
        v: sum(
            list
                .flatMap((a) => a.invoices.flatMap((i) => i.payments.filter((p) => p.method === name && p.date.getMonth() >= f.m0)))
                .map((p) => p.amount),
        ),
    }))

    // ----- income (location only; the stage filter applies to fee panels) -----
    const streamMonths: Record<StreamCode, number[]> = { TUI: [], TRN: [], RES: [], ACT: [], OTH: [] }
    for (const s of REVENUE_STREAMS) streamMonths[s.code] = Array(NM).fill(0)
    for (const a of locAccounts)
        for (const inv of a.invoices) {
            if (!inv.total) continue
            const tui = (inv.lines.tuition - inv.discount) / inv.total
            const res = inv.lines.resources / inv.total
            const trn = inv.lines.transport / inv.total
            for (const p of inv.payments) {
                const m = p.date.getMonth()
                streamMonths.TUI[m] += p.amount * tui
                streamMonths.RES[m] += p.amount * res
                streamMonths.TRN[m] += p.amount * trn
            }
        }
    for (const l of data.income) if (inLoc(l.location)) l.months.forEach((v, m) => (streamMonths[l.stream][m] += v))

    // ----- expenditure / budget -----
    const lines = data.budget.filter((l) => inLoc(l.location))
    const incomeOf = (m: number) => sum(REVENUE_STREAMS.map((s) => streamMonths[s.code][m]))
    const expenseOf = (m: number) => sum(lines.map((l) => l.actual[m]))
    let cash = f.location === "all" ? data.openingCash : 0
    const cashAt: number[] = []
    for (let m = 0; m < NM; m++) cashAt.push((cash += incomeOf(m) - expenseOf(m)))

    let cumB = 0,
        cumA = 0
    const monthly = months.map((m) => {
        const row: Record<string, number | string> = {
            m,
            label: monthLabel(m),
            income: incomeOf(m),
            expense: expenseOf(m),
            net: incomeOf(m) - expenseOf(m),
            cash: cashAt[m],
            budgetCum: (cumB += sum(lines.map((l) => l.budget[m] * monthShare(m)))),
            actualCum: (cumA += expenseOf(m)),
        }
        for (const s of REVENUE_STREAMS) row[s.code] = streamMonths[s.code][m]
        for (const c of BUDGET_CATEGORIES) row[c.code] = sum(lines.filter((l) => l.category === c.code).map((l) => l.actual[m]))
        return row
    })
    const income = sum(months.map(incomeOf))
    const expense = sum(months.map(expenseOf))
    const streams = REVENUE_STREAMS.map((s) => ({
        name: s.name,
        code: s.code,
        color: s.color,
        v: sum(months.map((m) => streamMonths[s.code][m])),
    }))

    const budgetRow = (g: BudgetLine[]) => {
        const annual = sum(g.map((l) => l.annual))
        const budget = sum(g.map((l) => lineBudget(l, months)))
        const actual = sum(g.map((l) => lineActual(l, months)))
        const fullB = sum(g.map((l) => lineBudget(l, ytd)))
        const fullA = sum(g.map((l) => lineActual(l, ytd)))
        return {
            annual,
            budget,
            actual,
            variance: actual - budget,
            varPct: ratio(actual - budget, budget),
            /** spent so far this year ÷ annual budget */
            used: ratio(fullA, annual),
            /** year-end at the current spend-to-budget ratio */
            forecast: fullB ? annual * (fullA / fullB) : 0,
        }
    }
    const budget = budgetRow(lines)
    const byCategory = BUDGET_CATEGORIES.map((c) => ({
        key: c.code,
        label: c.name,
        color: c.color,
        ...budgetRow(lines.filter((l) => l.category === c.code)),
    })).filter((r) => r.annual > 0)
    const budgetByLocation = LOCATIONS.filter((l) => inLoc(l.id)).map((l) => ({
        key: l.id,
        label: l.short,
        ...budgetRow(lines.filter((x) => x.location === l.id)),
    }))
    const budgetLines = lines
        .map((l) => ({ location: l.location, category: l.category, ...budgetRow([l]) }))
        .sort((a, b) => b.varPct - a.varPct)
    const varianceHeat = BUDGET_CATEGORIES.map((c) =>
        budgetByLocation.map((l) => budgetLines.find((x) => x.location === l.key && x.category === c.code)?.varPct ?? null),
    )

    // ----- payroll -----
    const staff = data.payroll.filter((p) => inLoc(p.location))
    const payMonthly = months.map((m) => {
        const parts = staff.map((p) => payrollMonth(p, m))
        return {
            label: monthLabel(m),
            basic: sum(parts.map((x) => x.basic)),
            housing: sum(parts.map((x) => x.housing)),
            allowances: sum(parts.map((x) => x.allowances)),
            eosb: sum(parts.map((x) => x.eosb)),
            headcount: staff.filter((p) => p.months[m] > 0).length,
        }
    })
    const lastCost = (g: PayrollRecord[]) => sum(g.map((p) => payrollMonth(p, LAST_CLOSED).total))
    const active = staff.filter((p) => p.months[LAST_CLOSED] > 0)
    const payLast = lastCost(active)
    const payPeriod = sum(months.map((m) => sum(staff.map((p) => payrollMonth(p, m).total))))
    const studentsAt = (loc: string) => data.accounts.filter((a) => (loc === "all" ? true : a.school === loc)).length
    const pupils = f.location === "HQ" ? 0 : studentsAt(f.location)
    const payGroup = (g: PayrollRecord[]) => {
        const a = g.filter((p) => p.months[LAST_CLOSED] > 0)
        const cost = lastCost(a)
        return { n: a.length, cost, avg: a.length ? cost / a.length : 0 }
    }
    const payByDept = DEPARTMENTS.map((d) => ({ key: d.code, label: d.name, ...payGroup(staff.filter((p) => p.dept === d.code)) })).filter(
        (r) => r.n > 0,
    )
    const payByLocation = LOCATIONS.filter((l) => inLoc(l.id)).map((l) => {
        const g = payGroup(staff.filter((p) => p.location === l.id))
        const s = l.id === "HQ" ? 0 : studentsAt(l.id)
        return { key: l.id, label: l.short, ...g, students: s, perStudent: s ? (g.cost * 12) / s : 0 }
    })
    const grades = [...new Set(staff.map((p) => p.grade))].sort()
    const payByGrade = grades.map((g) => {
        const r = active.filter((p) => p.grade === g)
        return {
            grade: g,
            n: r.length,
            basic: avg(r.map((p) => p.basic)),
            pkg: avg(r.map((p) => p.basic + p.housing + p.transport)),
            cost: lastCost(r),
        }
    })
    const newHires = active
        .filter((p) => p.hireDate >= new Date(2026, 0, 1))
        .map((p) => ({ p, cost: payrollMonth(p, LAST_CLOSED).total }))
        .sort((a, b) => b.cost - a.cost)
    const teachingCost = lastCost(active.filter((p) => p.teaching))

    return {
        f,
        list,
        n,
        months,
        fees: {
            ...totals,
            gross: sum(list.map((a) => a.m.gross)),
            discount: sum(list.map((a) => a.m.discount)),
            discounted: list.filter((a) => a.m.discount > 0).length,
            over90: ageing[4].v,
            statusCount,
            ageing,
            curve,
            currentBilled,
            currentCollected,
            byLocation,
            byStage,
            byYg,
            schoolStage,
            discounts,
            methods,
        },
        income,
        expense,
        net: income - expense,
        margin: ratio(income - expense, income),
        streams,
        monthly,
        cash: cashAt[NM - 1],
        cashStart: f.m0 === 0 ? (f.location === "all" ? data.openingCash : 0) : cashAt[f.m0 - 1],
        /** average daily spend over the closed months */
        dailySpend:
            sum(
                monthRange(0)
                    .slice(0, LAST_CLOSED + 1)
                    .map(expenseOf),
            ) / 273,
        budget,
        byCategory,
        budgetByLocation,
        budgetLines,
        varianceHeat,
        overBudget: budgetLines.filter((l) => l.varPct > 5),
        payroll: {
            headcount: active.length,
            last: payLast,
            period: payPeriod,
            perFte: active.length ? payLast / active.length : 0,
            pctOfIncome: ratio(payPeriod, income),
            perStudent: pupils ? (payLast * 12) / pupils : 0,
            teachingShare: ratio(teachingCost, payLast),
            teachingCost,
            monthly: payMonthly,
            byDept: payByDept,
            byLocation: payByLocation,
            byGrade: payByGrade,
            newHires,
        },
    }
}
export type FinAnalysis = ReturnType<typeof analyseFin>
