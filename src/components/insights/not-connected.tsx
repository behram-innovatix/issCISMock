import { buttonClass } from "@/components/ui/button"
import { Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import type { InsightsMeta } from "@/lib/insights"
import { Cable } from "lucide-react"
import Link from "next/link"

const STATUS: Record<InsightsMeta["sources"][number]["status"], string> = {
    new: "Not synced yet",
    healthy: "Healthy",
    degraded: "Needs review",
    failing: "Failing",
}

/** Shown instead of a platform's dashboards until one of its sources has synced usable data. */
export function NotConnected({ name, meta }: { name: string; meta: InsightsMeta }) {
    return (
        <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-2xl">
                    <Cable className="size-6" />
                </span>
                <div className="max-w-md">
                    <h3 className="text-ink text-[15px] font-semibold">No {name} data yet</h3>
                    <p className="text-muted mt-1 text-[12.5px]">
                        {meta.reason ?? `Connect a ${name} data source to see these dashboards.`} An administrator can set one up in
                        Connections.
                    </p>
                </div>
                {meta.sources.length > 0 && (
                    <ul className="flex flex-wrap justify-center gap-1.5">
                        {meta.sources.map((s) => (
                            <li key={s.name}>
                                <Pill>
                                    {s.name} · {s.is_active ? STATUS[s.status] : "Paused"}
                                </Pill>
                            </li>
                        ))}
                    </ul>
                )}
                <Link href="/admin/connections" className={buttonClass("soft", "sm")}>
                    <Cable className="size-3.5" /> Open Connections
                </Link>
            </div>
        </Panel>
    )
}
