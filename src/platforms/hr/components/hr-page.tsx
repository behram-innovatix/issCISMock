"use client"

import { PageHeader } from "@/components/shell/page-header"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { TERM_LABEL } from "@/lib/calendar"
import type { EduDataset } from "@/platforms/edu/data/types"
import type { ReactNode } from "react"
import type { HrAnalysis, HrFilters } from "../analytics"
import type { HrDataset } from "../data/types"
import { useHrAnalysis } from "../hooks"
import { HrFilterRail } from "./filter-rail"

export interface HrCtx {
    data: HrDataset
    edu: EduDataset
    a: HrAnalysis
    f: HrFilters
}

/** Frame for every HR screen: header, sticky filter rail, loading/error states. */
export function HrPage({ title, description, children }: { title: string; description?: string; children: (ctx: HrCtx) => ReactNode }) {
    const { data, edu, analysis, filters, error } = useHrAnalysis()
    return (
        <>
            <PageHeader eyebrow={`HR · ${TERM_LABEL}`} title={title} description={description} />
            {error ? (
                <div className="border-bad/20 bg-bad-soft text-bad-ink rounded-2xl border p-5 text-[13px]">{String(error)}</div>
            ) : !data || !edu || !analysis ? (
                <ScreenSkeleton />
            ) : (
                <>
                    <HrFilterRail analysis={analysis} />
                    <div className="space-y-4">{children({ data, edu, a: analysis, f: filters })}</div>
                </>
            )}
        </>
    )
}
