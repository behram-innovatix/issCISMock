"use client"

import { cn } from "@/lib/cn"

export interface SegOption<T extends string | number> {
    value: T
    label: string
    disabled?: boolean
}

export function Segmented<T extends string | number>({
    value,
    options,
    onChange,
    label,
    size = "md",
}: {
    value: T
    options: SegOption<T>[]
    onChange: (v: T) => void
    label: string
    size?: "sm" | "md"
}) {
    return (
        <div role="radiogroup" aria-label={label} className="border-line bg-surface-2 inline-flex rounded-xl border p-0.5">
            {options.map((o) => {
                const on = o.value === value
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={o.disabled}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            "rounded-[10px] font-semibold whitespace-nowrap transition-all duration-200",
                            size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]",
                            on ? "bg-surface text-primary shadow-[0_1px_3px_rgba(20,40,90,.12)]" : "text-ink-2 hover:text-ink",
                            o.disabled && "hover:text-ink-2 cursor-not-allowed opacity-40",
                        )}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}
