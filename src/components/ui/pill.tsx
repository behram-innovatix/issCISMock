import { cn } from "@/lib/cn"
import type { PillTone } from "@/lib/status"
import type { ReactNode } from "react"

const TONE: Record<PillTone, string> = {
    good: "bg-good-soft text-good-ink",
    warn: "bg-warn-soft text-warn-ink",
    bad: "bg-bad-soft text-bad-ink",
    auth: "bg-auth-soft text-auth-ink",
    info: "bg-primary-soft text-primary",
    neutral: "bg-bg-2 text-ink-2",
}

export function Pill({
    tone = "neutral",
    children,
    dot,
    className,
}: {
    tone?: PillTone
    children: ReactNode
    dot?: boolean
    className?: string
}) {
    return (
        <span
            className={cn(
                "tabular inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                TONE[tone],
                className,
            )}
        >
            {dot && <i className="size-1.5 rounded-full bg-current opacity-80" />}
            {children}
        </span>
    )
}
