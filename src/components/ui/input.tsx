import { useId, type InputHTMLAttributes, type ReactNode } from "react"

/** Labelled text field with an optional leading icon and trailing slot (e.g. a show-password toggle). */
export function Input({
    label,
    icon,
    trailing,
    className,
    id,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode; trailing?: ReactNode }) {
    const auto = useId()
    const inputId = id ?? auto
    return (
        <div className={className}>
            <label htmlFor={inputId} className="text-ink-2 mb-1.5 block text-[12px] font-semibold">
                {label}
            </label>
            <div className="border-line bg-surface focus-within:border-primary/40 focus-within:ring-primary/10 flex h-11 items-center gap-2.5 rounded-xl border px-3.5 transition-all focus-within:ring-4">
                {icon && <span className="text-muted shrink-0 [&>svg]:size-4">{icon}</span>}
                <input id={inputId} {...props} className="placeholder:text-muted text-ink w-full min-w-0 bg-transparent text-[13.5px] outline-none" />
                {trailing}
            </div>
        </div>
    )
}
