"use client"

import { PageHeader } from "@/components/shell/page-header"
import { NotConnected } from "@/components/insights/not-connected"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { TERM_LABEL } from "@/lib/calendar"
import type { ReactNode } from "react"
import type { EduAnalysis, EduFilters } from "../analytics"
import type { EduDataset } from "../data/types"
import { useEduAnalysis } from "../hooks"
import { EduFilterRail } from "./filter-rail"

export interface EduCtx {
    data: EduDataset
    a: EduAnalysis
    f: EduFilters
}

/** Frame for every EDU screen: header, sticky filter rail, loading/error states. */
export function EduPage({
    title,
    description,
    actions,
    rail = true,
    children,
}: {
    title: string
    description?: string
    actions?: ReactNode
    rail?: boolean
    children: (ctx: EduCtx) => ReactNode
}) {
    const { data, analysis, filters, error } = useEduAnalysis()
    return (
        <>
            <PageHeader eyebrow={TERM_LABEL ? `EDU · ${TERM_LABEL}` : "EDU"} title={title} description={description} actions={actions} />
            {error ? (
                <div className="border-bad/20 bg-bad-soft text-bad-ink rounded-2xl border p-5 text-[13px]">{String(error)}</div>
            ) : data && !data.meta.connected ? (
                <NotConnected name="EDU" meta={data.meta} />
            ) : !data || !analysis ? (
                <ScreenSkeleton />
            ) : (
                <>
                    {rail && <EduFilterRail data={data} analysis={analysis} />}
                    <div className="space-y-4">{children({ data, a: analysis, f: filters })}</div>
                </>
            )}
        </>
    )
}
