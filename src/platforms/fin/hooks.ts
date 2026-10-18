"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { analyseFin } from "./analytics"
import { loadFin } from "./data/source"
import { useFin } from "./state"

export function useFinData() {
    return useQuery({ queryKey: ["fin", "dataset"], queryFn: loadFin })
}

/** Dataset + the current filter roll-up. `analysis` is undefined while loading or when nothing is connected. */
export function useFinAnalysis() {
    const { data, error } = useFinData()
    const filters = useFin((s) => s.filters)
    const analysis = useMemo(() => (data?.meta.connected ? analyseFin(data, filters) : undefined), [data, filters])
    return { data, analysis, filters, error }
}
