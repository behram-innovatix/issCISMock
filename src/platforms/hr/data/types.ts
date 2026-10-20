import type { InsightsMeta } from "@/lib/insights"
import type { Gender } from "@/platforms/edu/data/types"
import type { LeaveType } from "./constants"

export type AppraisalStatus = "Completed" | "Manager review" | "Self review" | "Not started"

export interface Appraisal {
    cycle: string
    label: string
    status: AppraisalStatus
    /** 1–5 per competency, present once the manager has scored it */
    scores?: number[]
    overall?: number
    reviewerId?: string
}

export interface EmployeeKpi {
    name: string
    target: number
    actual: number
    unit: "%" | "h" | "/5"
    /** actual ÷ target, capped at 120% */
    attainment: number
}

export interface LeaveRequest {
    type: LeaveType
    from: Date
    days: number
    status: "Approved" | "Pending" | "Rejected"
}

export interface Employee {
    id: string
    name: string
    gender: Gender
    location: string
    dept: string
    role: string
    teaching: boolean
    grade: string
    nat: string
    hireDate: Date
    managerId?: string
    /** HR day-code index per working day (NW × 5) */
    days: Uint8Array
    /** minutes late on late days */
    lateMins: Uint8Array
    /** leave days taken per month Jan–Oct 2026, per LEAVE_TYPES */
    leaveMonths: number[][]
    entitlement: { Annual: number; Sick: number }
    leave: LeaveRequest[]
    appraisals: Appraisal[]
    kpis: EmployeeKpi[]
    /** section keys taught (teachers only) */
    sections: string[]
    formSection?: string
}

export interface HrDataset {
    employees: Employee[]
    meta: InsightsMeta
}
