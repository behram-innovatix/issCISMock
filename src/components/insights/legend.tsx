import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export function Legend({ items, className }: { items: { label: ReactNode; color: string; dashed?: boolean }[]; className?: string }) {
    return (
        <div className={cn("text-ink-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px]", className)}>
            {items.map((it, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                    {it.dashed ? (
                        <i className="w-3.5 border-t-2 border-dashed" style={{ borderColor: it.color }} />
                    ) : (
                        <i className="size-2.5 rounded-[3px]" style={{ background: it.color }} />
                    )}
                    {it.label}
                </span>
            ))}
        </div>
    )
}
