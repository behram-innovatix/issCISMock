"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useEduData } from "../edu/hooks"
import { analyseHr } from "./analytics"
import { loadHr } from "./data/source"
import type { Employee } from "./data/types"
import { useHr } from "./state"

export function useHrData() {
    return useQuery({ queryKey: ["hr", "dataset"], queryFn: loadHr })
}

/** Dataset + the current filter roll-up. `analysis` is undefined while loading or when nothing is connected. */
export function useHrAnalysis() {
    const { data, error } = useHrData()
    const edu = useEduData()
    const filters = useHr((s) => s.filters)
    const analysis = useMemo(() => (data?.meta.connected ? analyseHr(data, filters) : undefined), [data, filters])
    return { data, edu: edu.data, analysis, filters, error: error ?? edu.error }
}

/** id → employee, for linking EDU staff to their HR record when HR is connected. */
export function useEmployeeIndex() {
    const { data } = useHrData()
    return useMemo(() => new Map<string, Employee>((data?.employees ?? []).map((e) => [e.id, e])), [data])
}
