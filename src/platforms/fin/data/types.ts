import type { Stage } from "@/platforms/edu/data/constants"
import type { DiscountId, PayerProfile, PaymentMethod, StreamCode } from "./constants"

export interface Payment {
    date: Date
    amount: number
    method: PaymentMethod
}

export interface Instalment {
    due: Date
    amount: number
}

export interface Invoice {
    term: string
    issued: Date
    lines: { tuition: number; resources: number; transport: number }
    discount: number
    /** lines − discount */
    total: number
    /** one instalment normally; three on an instalment plan */
    instalments: Instalment[]
    payments: Payment[]
}

/** One fee account per EDU student (same id), denormalised like the HR records. */
export interface FeeAccount {
    id: number
    name: string
    school: string
    stage: Stage
    yg: string
    sec: string
    transport: boolean
    discount?: DiscountId
    profile: PayerProfile
    invoices: Invoice[]
}

/** Monthly payroll for one HR employee (same id). */
export interface PayrollRecord {
    id: number
    name: string
    role: string
    location: string
    dept: string
    teaching: boolean
    grade: string
    hireDate: Date
    basic: number
    housing: number
    transport: number
    /** gross pay per month Jan–Oct (0 before joining, pro-rated in the joining month, net of unpaid leave) */
    months: number[]
}

export interface BudgetLine {
    location: string
    category: string
    annual: number
    /** Jan–Dec */
    budget: number[]
    /** Jan–Oct; October is month to date */
    actual: number[]
}

/** Non-fee income (activities, facility hire, grants) per location and month. */
export interface IncomeLine {
    location: string
    stream: Extract<StreamCode, "ACT" | "OTH">
    months: number[]
}

export interface FinDataset {
    accounts: FeeAccount[]
    payroll: PayrollRecord[]
    budget: BudgetLine[]
    income: IncomeLine[]
    /** group cash at 1 Jan 2026 */
    openingCash: number
}
