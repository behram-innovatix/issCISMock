import type { ReactNode } from "react"

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    description?: ReactNode
    actions?: ReactNode
}) {
    return (
        <div className="animate-fade mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                {eyebrow && <div className="eyebrow text-primary/80 mb-1.5">{eyebrow}</div>}
                <h1 className="font-display text-ink text-[clamp(22px,2.6vw,30px)] leading-tight font-semibold">{title}</h1>
                {description && <p className="text-ink-2 mt-1 max-w-2xl text-[13.5px]">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
