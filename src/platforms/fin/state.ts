import type { Stage } from "@/platforms/edu/data/constants"
import { create } from "zustand"
import { DEFAULT_FIN_FILTERS, type FinFilters } from "./analytics"
import type { AccountStatus, MonthKey } from "./data/constants"

export interface AccountRegisterState {
    q: string
    status: "all" | AccountStatus
    sort: string
    dir: 1 | -1
    page: number
}

interface FinState {
    filters: FinFilters
    register: AccountRegisterState
    setLocation: (v: string) => void
    setStage: (v: "all" | Stage) => void
    setPeriod: (v: MonthKey) => void
    reset: () => void
    setRegister: (p: Partial<AccountRegisterState>) => void
}

const DEFAULT_REGISTER: AccountRegisterState = { q: "", status: "all", sort: "balance", dir: -1, page: 0 }

export const useFin = create<FinState>((set) => ({
    filters: DEFAULT_FIN_FILTERS,
    register: DEFAULT_REGISTER,
    // the head office has no fee accounts, so a stage filter means nothing there
    setLocation: (location) =>
        set((s) => ({
            filters: { ...s.filters, location, stage: location === "HQ" ? "all" : s.filters.stage },
            register: { ...s.register, page: 0 },
        })),
    setStage: (stage) => set((s) => ({ filters: { ...s.filters, stage }, register: { ...s.register, page: 0 } })),
    setPeriod: (m0) => set((s) => ({ filters: { ...s.filters, m0 }, register: { ...s.register, page: 0 } })),
    reset: () => set({ filters: DEFAULT_FIN_FILTERS, register: DEFAULT_REGISTER }),
    setRegister: (p) => set((s) => ({ register: { ...s.register, page: 0, ...p } })),
}))
