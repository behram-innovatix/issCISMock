import type { PeriodKey } from "@/lib/calendar"
import type { Tone } from "@/lib/status"
import { create } from "zustand"
import { DEFAULT_HR_FILTERS, type HrFilters, type RoleFilter } from "./analytics"
import { deptOf } from "./data/constants"

export interface StaffRegisterState {
    q: string
    status: "all" | Tone
    sort: string
    dir: 1 | -1
    page: number
    /** 9-box cell from the Performance screen */
    box: { r: number; c: number; label: string } | null
}

interface HrState {
    filters: HrFilters
    register: StaffRegisterState
    impact: { sort: string; dir: 1 | -1; page: number; q: string }
    setLocation: (v: string) => void
    setDept: (v: string) => void
    setRole: (v: RoleFilter) => void
    setPeriod: (v: PeriodKey) => void
    reset: () => void
    setRegister: (p: Partial<StaffRegisterState>) => void
    setImpact: (p: Partial<HrState["impact"]>) => void
}

const DEFAULT_REGISTER: StaffRegisterState = { q: "", status: "all", sort: "appraisal", dir: -1, page: 0, box: null }
const DEFAULT_IMPACT = { sort: "classAtt", dir: -1 as const, page: 0, q: "" }

export const useHr = create<HrState>((set) => ({
    filters: DEFAULT_HR_FILTERS,
    register: DEFAULT_REGISTER,
    impact: DEFAULT_IMPACT,
    setLocation: (location) => set((s) => ({ filters: { ...s.filters, location }, register: { ...s.register, page: 0 } })),
    setDept: (dept) =>
        set((s) => ({
            // picking a department implies its role type
            filters: { ...s.filters, dept, role: dept === "all" ? s.filters.role : deptOf(dept).teaching ? "teaching" : "support" },
            register: { ...s.register, page: 0 },
        })),
    setRole: (role) =>
        set((s) => {
            const keep = s.filters.dept === "all" || role === "all" || deptOf(s.filters.dept).teaching === (role === "teaching")
            return { filters: { ...s.filters, role, dept: keep ? s.filters.dept : "all" }, register: { ...s.register, page: 0 } }
        }),
    setPeriod: (w0) => set((s) => ({ filters: { ...s.filters, w0 } })),
    reset: () => set({ filters: DEFAULT_HR_FILTERS, register: DEFAULT_REGISTER, impact: DEFAULT_IMPACT }),
    setRegister: (p) => set((s) => ({ register: { ...s.register, page: 0, ...p } })),
    setImpact: (p) => set((s) => ({ impact: { ...s.impact, page: 0, ...p } })),
}))
