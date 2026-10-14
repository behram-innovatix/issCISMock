"use client"

import { cn } from "@/lib/cn"
import { Check, ChevronDown, Search } from "lucide-react"
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react"

export interface SelectOption {
    value: string
    label: string
    sub?: string
    group?: string
    disabled?: boolean
}

/** Searchable, grouped dropdown used by the filter rails (port of the mockup's makeDD). */
export function FilterSelect({
    label,
    icon,
    value,
    options,
    onChange,
    disabled,
    searchable,
    placeholder = "Search…",
    className,
}: {
    label: string
    icon?: ReactNode
    value: string
    options: SelectOption[]
    onChange: (v: string) => void
    disabled?: boolean
    searchable?: boolean
    placeholder?: string
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState("")
    const [hi, setHi] = useState(0)
    const root = useRef<HTMLDivElement>(null)
    const listId = useId()

    const visible = useMemo(() => {
        const t = q.trim().toLowerCase()
        const f = t ? options.filter((o) => o.label.toLowerCase().includes(t) || o.sub?.toLowerCase().includes(t)) : options
        return f.slice(0, 80)
    }, [options, q])
    const current = options.find((o) => o.value === value)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent) => {
            if (!root.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", close)
        return () => document.removeEventListener("mousedown", close)
    }, [open])

    const openList = () => {
        setQ("")
        setHi(
            Math.max(
                0,
                options.findIndex((o) => o.value === value),
            ),
        )
        setOpen(true)
    }
    const choose = (o: SelectOption) => {
        if (o.disabled) return
        onChange(o.value)
        setOpen(false)
    }
    const onKey = (e: React.KeyboardEvent) => {
        if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            openList()
            return
        }
        if (!open) return
        if (e.key === "Escape") setOpen(false)
        else if (e.key === "ArrowDown") {
            e.preventDefault()
            setHi((h) => Math.min(visible.length - 1, h + 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setHi((h) => Math.max(0, h - 1))
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (visible[hi]) choose(visible[hi])
        }
    }

    return (
        <div ref={root} className={cn("relative min-w-0", className)} onKeyDown={onKey}>
            <span className="eyebrow mb-1 block pl-0.5">{label}</span>
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => (open ? setOpen(false) : openList())}
                className={cn(
                    "bg-surface text-ink flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-[13px] font-semibold transition-all duration-200",
                    open ? "border-primary/40 ring-primary/10 ring-4" : "border-line hover:border-line-strong",
                    disabled && "cursor-not-allowed opacity-50",
                )}
            >
                {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
                <span className="min-w-0 flex-1 truncate">{current?.label ?? "—"}</span>
                <ChevronDown className={cn("text-muted size-4 shrink-0 transition-transform duration-200", open && "rotate-180")} />
            </button>
            {open && (
                <div className="animate-fade border-line bg-surface shadow-pop absolute top-[calc(100%+6px)] left-0 z-40 w-full min-w-60 overflow-hidden rounded-xl border">
                    {searchable && (
                        <div className="border-line flex items-center gap-2 border-b px-3">
                            <Search className="text-muted size-4" />
                            <input
                                autoFocus
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value)
                                    setHi(0)
                                }}
                                placeholder={placeholder}
                                className="placeholder:text-muted h-10 w-full bg-transparent text-[13px] outline-none"
                            />
                        </div>
                    )}
                    <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
                        {visible.length === 0 && <li className="text-muted px-3 py-3 text-[12.5px]">No matches</li>}
                        {visible.map((o, i) => {
                            const header = o.group && o.group !== visible[i - 1]?.group
                            return (
                                <li key={o.value} role="presentation">
                                    {header && <div className="eyebrow px-2.5 pt-2.5 pb-1">{o.group}</div>}
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={o.value === value}
                                        disabled={o.disabled}
                                        onMouseEnter={() => setHi(i)}
                                        onClick={() => choose(o)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                                            i === hi && "bg-primary-softer",
                                            o.value === value ? "text-primary font-semibold" : "text-ink",
                                            o.disabled && "cursor-not-allowed opacity-40",
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">{o.label}</span>
                                            {o.sub && <span className="text-muted block truncate text-[11px] font-normal">{o.sub}</span>}
                                        </span>
                                        {o.value === value && <Check className="size-4 shrink-0" />}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}
