import { Avatar } from "@/components/ui/avatar"
import { Empty } from "@/components/ui/panel"
import { cn } from "@/lib/cn"
import Link from "next/link"
import type { ReactNode } from "react"

export interface LeaderItem {
    id: number
    name: string
    meta: string
    value: ReactNode
    tone?: "pos" | "neg" | "neutral"
    href: string
}

export function Leaderboard({ items, empty }: { items: LeaderItem[]; empty?: string }) {
    if (!items.length) return <Empty>{empty}</Empty>
    return (
        <ol className="space-y-1">
            {items.map((it, i) => (
                <li key={it.id}>
                    <Link
                        href={it.href}
                        className="group hover:bg-primary-softer flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200"
                    >
                        <span className="tabular text-muted w-4 text-center text-[11.5px] font-bold">{i + 1}</span>
                        <Avatar name={it.name} seed={it.id} size="sm" />
                        <span className="min-w-0 flex-1">
                            <b className="text-ink group-hover:text-primary block truncate text-[13px] font-semibold">{it.name}</b>
                            <span className="text-muted block truncate text-[11.5px]">{it.meta}</span>
                        </span>
                        <span
                            className={cn(
                                "tabular text-[13px] font-bold",
                                it.tone === "pos" && "text-good-ink",
                                it.tone === "neg" && "text-bad-ink",
                                (!it.tone || it.tone === "neutral") && "text-ink",
                            )}
                        >
                            {it.value}
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    )
}
