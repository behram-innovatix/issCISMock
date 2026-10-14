import { cn } from "@/lib/cn"

export function Meter({ value, color = "var(--primary)", className }: { value: number; color?: string; className?: string }) {
    return (
        <div className={cn("bg-bg-2 h-1.5 w-full overflow-hidden rounded-full", className)}>
            <i
                className="block h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
            />
        </div>
    )
}
