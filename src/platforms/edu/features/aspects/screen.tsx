"use client"

import { PageHeader } from "@/components/shell/page-header"
import { Panel } from "@/components/ui/panel"
import { ChartColumn } from "lucide-react"

/**
 * Aspect Analysis reads assessment results (grades per aspect and result set). Assessments aren't a
 * canonical CIS stream yet, so until one is added and connected the screen says so.
 */
export function EduAspectsScreen() {
    return (
        <>
            <PageHeader
                eyebrow="EDU"
                title="Aspect Analysis"
                description="Assessment results by aspect, grade band and group, compared across result sets."
            />
            <Panel>
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-2xl">
                        <ChartColumn className="size-6" />
                    </span>
                    <div className="max-w-lg">
                        <h3 className="text-ink text-[15px] font-semibold">No assessment data connected yet</h3>
                        <p className="text-muted mt-1 text-[12.5px]">
                            This analysis needs assessment results (marksheets and grades per aspect). They aren’t part of the data the CIS
                            syncs yet; once an assessment stream is added to the EDU connection, the analysis will appear here.
                        </p>
                    </div>
                </div>
            </Panel>
        </>
    )
}
