import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export type Span = 3 | 4 | 5 | 6 | 7 | 8 | 12
const SPAN: Record<Span, string> = {
    3: "col-span-12 md:col-span-6 xl:col-span-3",
    4: "col-span-12 md:col-span-6 xl:col-span-4",
    5: "col-span-12 xl:col-span-5",
    6: "col-span-12 xl:col-span-6",
    7: "col-span-12 xl:col-span-7",
    8: "col-span-12 xl:col-span-8",
    12: "col-span-12",
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("grid grid-cols-12 gap-4", className)}>{children}</div>
}

export function Panel({
    title,
    subtitle,
    action,
    span = 12,
    className,
    bodyClassName,
    children,
}: {
    title?: ReactNode
    subtitle?: ReactNode
    action?: ReactNode
    span?: Span
    className?: string
    bodyClassName?: string
    children: ReactNode
}) {
    return (
        <section
            className={cn(
                "animate-rise border-line bg-surface shadow-card min-w-0 rounded-2xl border p-5 transition-shadow duration-300",
                SPAN[span],
                className,
            )}
        >
            {(title || action) && (
                <header className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h3 className="text-ink text-[14.5px] font-semibold">{title}</h3>}
                        {subtitle && <p className="text-muted mt-0.5 text-[12px]">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </header>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    )
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("text-muted text-[12px] leading-relaxed", className)}>{children}</p>
}

export function Empty({ children = "No records in this filter." }: { children?: ReactNode }) {
    return (
        <div className="border-line-strong text-muted flex h-full min-h-24 items-center justify-center rounded-xl border border-dashed text-[12.5px]">
            {children}
        </div>
    )
}
