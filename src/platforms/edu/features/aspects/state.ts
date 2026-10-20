import { create } from "zustand"
import { ASPECT_ANALYSES } from "../../data/aspects"

export type Outcome = "count" | "pct"

interface AspectsState {
    /** saved aspect analysis id */
    analysis: string
    outcome: Outcome
    /** bands as rows, aspects as columns */
    transpose: boolean
    /** aspect focused in the group table */
    aspect: string
    setAnalysis: (v: string) => void
    setOutcome: (v: Outcome) => void
    toggleTranspose: () => void
    setAspect: (v: string) => void
}

export const useAspects = create<AspectsState>((set) => ({
    analysis: ASPECT_ANALYSES[0].id,
    outcome: "count",
    transpose: false,
    aspect: "ASP-MAT",
    setAnalysis: (analysis) => set({ analysis }),
    setOutcome: (outcome) => set({ outcome }),
    toggleTranspose: () => set((s) => ({ transpose: !s.transpose })),
    setAspect: (aspect) => set({ aspect }),
}))
