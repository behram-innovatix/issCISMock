"use client"

import { PageHeader } from "@/components/shell/page-header"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import type { ReactNode } from "react"
import type { FinAnalysis, FinFilters } from "../analytics"
import { FY_LABEL } from "../data/constants"
import type { FinDataset } from "../data/types"
import { useFinAnalysis } from "../hooks"
import { FinFilterRail } from "./filter-rail"

export interface FinCtx {
    data: FinDataset
    a: FinAnalysis
    f: FinFilters
}

/** Frame for every Finance screen: header, sticky filter rail, loading/error states. */
export function FinPage({ title, description, children }: { title: string; description?: string; children: (ctx: FinCtx) => ReactNode }) {
    const { data, analysis, filters, error } = useFinAnalysis()
    return (
        <>
            <PageHeader eyebrow={`Finance · ${FY_LABEL}`} title={title} description={description} />
            {error ? (
                <div className="border-bad/20 bg-bad-soft text-bad-ink rounded-2xl border p-5 text-[13px]">{String(error)}</div>
            ) : !data || !analysis ? (
                <ScreenSkeleton />
            ) : (
                <>
                    <FinFilterRail data={data} analysis={analysis} />
                    <div className="space-y-4">{children({ data, a: analysis, f: filters })}</div>
                </>
            )}
        </>
    )
}
