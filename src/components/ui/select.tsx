import { cn } from "@/lib/cn"
import { ChevronDown } from "lucide-react"
import type { SelectHTMLAttributes } from "react"

/** Native select styled like the text inputs (compact by default). */
export function Select({
    options,
    placeholder,
    className,
    size = "sm",
    ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    options: { value: string; label: string; disabled?: boolean }[]
    placeholder?: string
    size?: "sm" | "md"
}) {
    return (
        <div className={cn("relative", className)}>
            <select
                {...props}
                className={cn(
                    "border-line bg-surface text-ink focus:border-primary/40 focus:ring-primary/10 w-full appearance-none rounded-xl border pr-8 pl-3 transition-all outline-none focus:ring-4 disabled:opacity-50",
                    size === "sm" ? "h-9 text-[12.5px]" : "h-11 text-[13.5px]",
                )}
            >
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
        </div>
    )
}
