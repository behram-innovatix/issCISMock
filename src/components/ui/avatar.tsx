import { cn } from "@/lib/cn"
import { initials } from "@/lib/format"

const TINTS = [
    ["#e8eefc", "#2f5bd8"],
    ["#e3f5f7", "#11808d"],
    ["#efe9fd", "#6a3fd6"],
    ["#fbe9f2", "#b0407a"],
    ["#fdf1e2", "#a95f0b"],
    ["#e6f5ee", "#157a50"],
]

/** Stable tint index for any id (numbers or strings such as GUIDs). */
const tintOf = (seed: number | string) =>
    typeof seed === "number" ? seed : [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)

export function Avatar({ name, seed = 0, size = "md" }: { name: string; seed?: number | string; size?: "sm" | "md" | "lg" }) {
    const [bg, fg] = TINTS[tintOf(seed) % TINTS.length]
    return (
        <span
            aria-hidden
            className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
                size === "sm" && "size-7 text-[10.5px]",
                size === "md" && "size-9 text-[12px]",
                size === "lg" && "size-14 text-[17px]",
            )}
            style={{ background: bg, color: fg }}
        >
            {initials(name)}
        </span>
    )
}
