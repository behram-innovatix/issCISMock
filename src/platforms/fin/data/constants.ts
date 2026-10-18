// Reference data for the Finance platform. Amounts are QAR. The financial year is the calendar year;
// fees are billed per school term, so FY 2026 carries Terms 2–3 of 2025–26 and Term 1 of 2026–27.
import type { Stage } from "@/platforms/edu/data/constants"

export const FY_LABEL = "FY 2026"
export const FIN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** Months with actuals: Jan–Sep are closed, Oct is month to date (to 8 Oct). */
export const NM = 10
export const OCT_FRACTION = 8 / 31
/** Share of a month's run-rate that has been incurred by the as-of date. */
export const monthShare = (m: number) => (m === NM - 1 ? OCT_FRACTION : 1)
export const LAST_CLOSED = NM - 2

/** Period filter: first month index included. */
export type MonthKey = 0 | 4 | 7
export const FIN_PERIODS: { value: MonthKey; label: string; long: string }[] = [
    { value: 0, label: "Year to date", long: "Year to date (Jan – 8 Oct)" },
    { value: 4, label: "Last 6 months", long: "May – 8 Oct" },
    { value: 7, label: "Last 3 months", long: "Aug – 8 Oct" },
]
export const finPeriodLong = (m0: MonthKey) => FIN_PERIODS.find((p) => p.value === m0)!.long
export const monthRange = (m0: number) => Array.from({ length: NM - m0 }, (_, i) => m0 + i)

/* ---------- fees ---------- */

/** Annual tuition by stage; Al Jazeera (co-ed, larger campus) charges a premium. */
export const TUITION: Record<Stage, number> = { Infant: 24000, Junior: 28500, Secondary: 34000 }
export const SCHOOL_PREMIUM: Record<string, number> = { S1: 1.08, S2: 1, S3: 1 }
export const RESOURCE_FEE: Record<Stage, number> = { Infant: 1200, Junior: 1600, Secondary: 2100 }
export const TRANSPORT_FEE = 4200

export interface FeeTerm {
    id: string
    label: string
    short: string
    /** share of the annual fee billed this term */
    share: number
    /** reporting month the term is billed in (period filter) */
    month: number
    issued: Date
    due: Date
}
export const TERMS: FeeTerm[] = [
    {
        id: "2526-T2",
        label: "2025–26 Term 2",
        short: "T2 25–26",
        share: 0.3,
        month: 0,
        issued: new Date(2026, 0, 4),
        due: new Date(2026, 0, 25),
    },
    {
        id: "2526-T3",
        label: "2025–26 Term 3",
        short: "T3 25–26",
        share: 0.3,
        month: 3,
        issued: new Date(2026, 3, 5),
        due: new Date(2026, 3, 26),
    },
    // returning families are billed with re-enrolment in July; new joiners are billed on admission
    {
        id: "2627-T1",
        label: "2026–27 Term 1",
        short: "T1 26–27",
        share: 0.4,
        month: 7,
        issued: new Date(2026, 6, 1),
        due: new Date(2026, 7, 1),
    },
]
export const NEW_JOINER_BILLING = { issued: new Date(2026, 7, 16), due: new Date(2026, 8, 15) }
export const CURRENT_TERM = TERMS[2]
export const termOf = (id: string) => TERMS.find((t) => t.id === id)!
/** Target share of the current term collected by each school week. */
export const COLLECTION_TARGET = [70, 78, 85, 90, 93, 95, 96]

export type DiscountId = "sibling" | "staff" | "merit" | "full"
export const DISCOUNTS: { id: DiscountId; label: string; rate: number; color: string }[] = [
    { id: "sibling", label: "Sibling", rate: 0.1, color: "var(--c1)" },
    { id: "staff", label: "Staff child", rate: 0.5, color: "var(--c2)" },
    { id: "merit", label: "Merit scholarship", rate: 0.5, color: "var(--c3)" },
    { id: "full", label: "Full scholarship", rate: 1, color: "var(--c4)" },
]
export const discountOf = (id: DiscountId) => DISCOUNTS.find((d) => d.id === id)!

export const PAYMENT_METHODS = ["Bank transfer", "Card", "Cheque", "Cash"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const METHOD_COLOR: Record<PaymentMethod, string> = {
    "Bank transfer": "var(--c1)",
    Card: "var(--c2)",
    Cheque: "var(--c5)",
    Cash: "var(--c6)",
}

export type PayerProfile = "prompt" | "late" | "instalments" | "arrears"
export const PAYER_LABEL: Record<PayerProfile, string> = {
    prompt: "Pays on time",
    late: "Usually pays late",
    instalments: "On an instalment plan",
    arrears: "History of arrears",
}

export const AGEING = ["Not yet due", "1–30 days", "31–60 days", "61–90 days", "90+ days"] as const
export const AGEING_COLOR = ["var(--c1)", "var(--c5)", "var(--warn)", "#e86a3c", "var(--bad)"]
export const ageingBucket = (days: number) => (days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4)

export type AccountStatus = "paid" | "current" | "overdue" | "arrears"
export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; tone: "good" | "info" | "warn" | "bad" }> = {
    paid: { label: "Paid", tone: "good" },
    current: { label: "Current", tone: "info" },
    overdue: { label: "Overdue", tone: "warn" },
    arrears: { label: "In arrears", tone: "bad" },
}
/** In arrears when more than 60 days overdue or a previous term is still unpaid. */
export const accountStatusOf = (balance: number, overdue: number, days: number, prior: number): AccountStatus =>
    balance < 1 ? "paid" : days > 60 || prior >= 1 ? "arrears" : overdue >= 1 ? "overdue" : "current"

/* ---------- budget, revenue, payroll ---------- */

export interface BudgetCategory {
    code: string
    name: string
    color: string
    /** monthly phasing weights Jan–Dec */
    phasing: number[]
}
const flat = Array(12).fill(1)
export const BUDGET_CATEGORIES: BudgetCategory[] = [
    { code: "SAL", name: "Salaries & benefits", color: "var(--c1)", phasing: flat },
    { code: "FAC", name: "Facilities & premises", color: "var(--c2)", phasing: [1, 1, 1, 1, 1.1, 1.3, 1.35, 1.35, 1.25, 1.05, 1, 1] },
    { code: "RES", name: "Teaching resources", color: "var(--c6)", phasing: [1.2, 0.8, 0.7, 1, 0.6, 0.5, 0.4, 2.6, 2, 0.9, 0.7, 0.6] },
    { code: "ITS", name: "IT & technology", color: "var(--c3)", phasing: [1, 0.8, 0.8, 0.8, 0.8, 0.9, 1.8, 1.9, 1.1, 0.8, 0.7, 0.6] },
    { code: "TRN", name: "Student transport", color: "var(--c5)", phasing: [1, 1, 1, 0.9, 1, 0.8, 0.2, 0.6, 1, 1, 1, 0.8] },
    {
        code: "MKT",
        name: "Marketing & admissions",
        color: "var(--c4)",
        phasing: [1.6, 1.8, 1.5, 1.2, 0.9, 0.6, 0.4, 0.7, 0.8, 1, 1.2, 0.8],
    },
    { code: "ADM", name: "Administration & fees", color: "var(--auth)", phasing: flat },
]
export const categoryOf = (code: string) => BUDGET_CATEGORIES.find((c) => c.code === code)!

export const REVENUE_STREAMS = [
    { code: "TUI", name: "Tuition fees", color: "var(--c1)" },
    { code: "TRN", name: "Transport fees", color: "var(--c5)" },
    { code: "RES", name: "Resources & uniforms", color: "var(--c6)" },
    { code: "ACT", name: "Activities & trips", color: "var(--c4)" },
    { code: "OTH", name: "Other income", color: "var(--c3)" },
] as const
export type StreamCode = (typeof REVENUE_STREAMS)[number]["code"]

/** Monthly package per HR grade: [basic, housing, transport allowance]. */
export const GRADE_PAY: Record<string, [number, number, number]> = {
    T1: [9000, 4000, 1000],
    T2: [10500, 4800, 1200],
    T3: [12000, 5600, 1400],
    T4: [14000, 6400, 1600],
    S1: [4200, 2200, 600],
    S2: [6000, 3200, 800],
    S3: [8500, 4500, 1000],
    S4: [11500, 5900, 1400],
    L1: [22000, 10000, 3000],
    L2: [30000, 13000, 4000],
}
export const GRADE_LABEL: Record<string, string> = {
    T: "Teaching",
    S: "Support",
    L: "Leadership",
}
/** End-of-service gratuity accrues at 3 weeks' basic per year of service. */
export const EOSB_RATE = 21 / 30 / 12
