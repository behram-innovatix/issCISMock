"use client"

import { useMemo } from "react"
import { indexValues, type ValueIndex } from "../../aspects"
import { generateAssessments } from "../../data/aspects"
import type { Student } from "../../data/types"

const cache = new WeakMap<Student[], ValueIndex>()

/** Assessment results for the loaded students, generated once per dataset. */
export function useAspectValues(students: Student[]): ValueIndex {
    return useMemo(() => {
        let idx = cache.get(students)
        if (!idx) {
            idx = indexValues(generateAssessments(students))
            cache.set(students, idx)
        }
        return idx
    }, [students])
}
