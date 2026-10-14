"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useEduData } from "../edu/hooks"
import { analyseHr } from "./analytics"
import { hrSource } from "./data/source"
import type { Employee } from "./data/types"
import { useHr } from "./state"

export function useHrData() {
    return useQuery({ queryKey: ["hr", "dataset"], queryFn: () => hrSource.load() })
}

export function useHrAnalysis() {
    const { data, error } = useHrData()
    const edu = useEduData()
    const filters = useHr((s) => s.filters)
    const analysis = useMemo(() => (data ? analyseHr(data, filters) : undefined), [data, filters])
    return { data, edu: edu.data, analysis, filters, error: error ?? edu.error }
}

/** id → employee lookup, used by EDU screens to name the staff behind a record. */
export function useStaffIndex() {
    const { data } = useHrData()
    return useMemo(() => new Map<number, Employee>((data?.employees ?? []).map((e) => [e.id, e])), [data])
}
