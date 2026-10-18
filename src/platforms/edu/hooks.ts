"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { analyseEdu } from "./analytics"
import { loadEdu } from "./data/source"
import type { StaffMember } from "./data/types"
import { useEdu } from "./state"

export function useEduData() {
    return useQuery({ queryKey: ["edu", "dataset"], queryFn: loadEdu })
}

/** Dataset + the current filter roll-up. `analysis` is undefined while loading or when nothing is connected. */
export function useEduAnalysis() {
    const { data, error } = useEduData()
    const filters = useEdu((s) => s.filters)
    const analysis = useMemo(() => (data?.meta.connected ? analyseEdu(data, filters) : undefined), [data, filters])
    return { data, analysis, filters, error }
}

/** id → staff member, for naming form tutors and who recorded behaviour. */
export function useStaffIndex() {
    const { data } = useEduData()
    return useMemo(() => new Map<string, StaffMember>((data?.staff ?? []).map((s) => [s.id, s])), [data])
}
