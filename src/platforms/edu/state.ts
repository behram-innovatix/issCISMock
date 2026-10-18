import type { PeriodKey } from "@/lib/calendar"
import type { Tone } from "@/lib/status"
import { create } from "zustand"
import { DEFAULT_EDU_FILTERS, type EduFilters } from "./analytics"
import { schoolOf, type Stage, YGS } from "./data/constants"

export type SortKey = "name" | "yg" | "house" | "att" | "late" | "ach" | "inc" | "net" | "ratio" | "status"

export interface RegisterState {
    cell: { ai: number; bi: number; label: string } | null
    q: string
    status: "all" | Tone
    sort: SortKey
    dir: 1 | -1
    page: number
}

interface EduState {
    filters: EduFilters
    register: RegisterState
    setSchool: (v: string) => void
    setStage: (v: string) => void
    setYg: (v: string) => void
    setSec: (v: string) => void
    setGender: (v: string) => void
    setPeriod: (v: PeriodKey) => void
    reset: () => void
    setRegister: (p: Partial<RegisterState>) => void
}

const DEFAULT_REGISTER: RegisterState = { cell: null, q: "", status: "all", sort: "ach", dir: -1, page: 0 }

/** Filter cascade ported from the mockup's syncControls(): stage resets year group/section, year group sets its stage. */
export const useEdu = create<EduState>((set) => ({
    filters: DEFAULT_EDU_FILTERS,
    register: DEFAULT_REGISTER,
    setSchool: (school) =>
        set((s) => {
            const intake = school === "all" ? "Co-educational" : schoolOf(school).intake
            const gender =
                intake === "Boys" && s.filters.gender === "F"
                    ? "all"
                    : intake === "Girls" && s.filters.gender === "M"
                      ? "all"
                      : s.filters.gender
            return { filters: { ...s.filters, school, gender, sec: "all" }, register: { ...s.register, page: 0 } }
        }),
    setStage: (stage) => set((s) => ({ filters: { ...s.filters, stage, yg: "all", sec: "all" }, register: { ...s.register, page: 0 } })),
    setYg: (yg) =>
        set((s) => ({
            filters: {
                ...s.filters,
                yg,
                sec: "all",
                stage: yg === "all" ? s.filters.stage : ((YGS.find((y) => y[0] === yg)?.[1] ?? s.filters.stage) as Stage),
            },
            register: { ...s.register, page: 0 },
        })),
    setSec: (sec) => set((s) => ({ filters: { ...s.filters, sec }, register: { ...s.register, page: 0 } })),
    setGender: (gender) => set((s) => ({ filters: { ...s.filters, gender }, register: { ...s.register, page: 0 } })),
    setPeriod: (w0) => set((s) => ({ filters: { ...s.filters, w0 } })),
    reset: () => set({ filters: DEFAULT_EDU_FILTERS, register: DEFAULT_REGISTER }),
    setRegister: (p) => set((s) => ({ register: { ...s.register, page: 0, ...p } })),
}))
