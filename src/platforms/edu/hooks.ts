"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { analyseEdu } from "./analytics"
import { eduSource } from "./data/source"
import { useEdu } from "./state"

export function useEduData() {
    return useQuery({ queryKey: ["edu", "dataset"], queryFn: () => eduSource.load() })
}

/** Dataset + the current filter roll-up. `analysis` is undefined while loading. */
export function useEduAnalysis() {
    const { data, error } = useEduData()
    const filters = useEdu((s) => s.filters)
    const analysis = useMemo(() => (data ? analyseEdu(data, filters) : undefined), [data, filters])
    return { data, analysis, filters, error }
}
