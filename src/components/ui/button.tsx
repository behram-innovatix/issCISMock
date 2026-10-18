import { cn } from "@/lib/cn"
import type { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "ghost" | "soft" | "danger"
type Size = "sm" | "md"

/** Button styling, also used for links that look like buttons. */
export const buttonClass = (variant: Variant = "ghost", size: Size = "md", className?: string) =>
    cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[12px]" : "h-9 px-3.5 text-[12.5px]",
        variant === "primary" && "brand-gradient text-white shadow-[0_6px_16px_-8px_rgba(47,91,216,.7)] hover:brightness-105",
        variant === "ghost" && "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink border",
        variant === "soft" && "bg-primary-soft text-primary hover:bg-[rgba(47,91,216,.12)]",
        variant === "danger" && "bg-bad text-white shadow-[0_6px_16px_-8px_rgba(224,71,79,.7)] hover:brightness-105",
        className,
    )

export function Button({
    variant = "ghost",
    size = "md",
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
    return <button type="button" {...props} className={buttonClass(variant, size, className)} />
}
