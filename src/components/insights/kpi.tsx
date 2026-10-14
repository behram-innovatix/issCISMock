import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(172px,1fr))] gap-3", className)}>{children}</div>
}

export function Kpi({
    label,
    value,
    foot,
    color = "var(--primary)",
    icon,
    className,
}: {
    label: ReactNode
    value: ReactNode
    foot?: ReactNode
    color?: string
    icon?: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "animate-rise group border-line bg-surface shadow-card relative overflow-hidden rounded-2xl border px-4 pt-3.5 pb-3.5 transition-all duration-300 hover:-translate-y-0.5",
                className,
            )}
        >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] opacity-80" style={{ background: color }} />
            <div className="text-ink-2 flex items-center gap-2 text-[11.5px] font-semibold">
                {icon ? (
                    <span
                        className="flex size-6 items-center justify-center rounded-lg [&>svg]:size-3.5"
                        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                    >
                        {icon}
                    </span>
                ) : (
                    <i className="size-2 rounded-[3px]" style={{ background: color }} />
                )}
                <span className="truncate">{label}</span>
            </div>
            <div className="tabular font-display text-ink mt-2 text-[clamp(21px,2vw,26px)] leading-tight font-semibold">{value}</div>
            {foot && <div className="text-muted mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">{foot}</div>}
        </div>
    )
}

export const Pos = ({ children }: { children: ReactNode }) => <span className="text-good-ink font-semibold">{children}</span>
export const Neg = ({ children }: { children: ReactNode }) => <span className="text-bad-ink font-semibold">{children}</span>
