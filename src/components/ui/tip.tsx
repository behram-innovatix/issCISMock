import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

/** Lightweight hover tooltip for HTML visualisations (heatmaps, grids, calendars). */
export function Tip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
    return (
        <span className={cn("group/tip relative block", className)}>
            {children}
            <span
                role="tooltip"
                className="bg-ink shadow-pop pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-lg px-2.5 py-1.5 text-[11.5px] leading-snug whitespace-pre-line text-white opacity-0 transition-all duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
            >
                {content}
            </span>
        </span>
    )
}
