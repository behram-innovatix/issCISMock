"use client"

import { Search, X } from "lucide-react"

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <label className="border-line bg-surface focus-within:border-primary/40 focus-within:ring-primary/10 flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border px-3 transition-all focus-within:ring-4">
            <Search className="text-muted size-4 shrink-0" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="placeholder:text-muted w-full bg-transparent text-[13px] outline-none"
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="text-muted hover:text-ink">
                    <X className="size-3.5" />
                </button>
            )}
        </label>
    )
}
