"use client"

import { Button } from "@/components/ui/button"
import { FilterSelect, type SelectOption } from "@/components/ui/filter-select"
import { Segmented } from "@/components/ui/segmented"
import { periodLong, PERIODS } from "@/lib/calendar"
import { fmt } from "@/lib/format"
import { Briefcase, Building2, RotateCcw, Search, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import type { HrAnalysis } from "../analytics"
import { DEPARTMENTS, deptOf, LOCATIONS, locationOf } from "../data/constants"
import { useHr } from "../state"

export function HrFilterRail({ analysis }: { analysis: HrAnalysis }) {
    const router = useRouter()
    const { filters: f, setLocation, setDept, setRole, setPeriod, reset } = useHr()

    const locOpts: SelectOption[] = [
        { value: "all", label: "All locations", sub: "3 schools + head office" },
        ...LOCATIONS.map((l) => ({ value: l.id, label: l.name })),
    ]
    const deptOpts: SelectOption[] = [
        { value: "all", label: "All departments" },
        ...DEPARTMENTS.filter((d) => f.role === "all" || d.teaching === (f.role === "teaching")).map((d) => ({
            value: d.code,
            label: d.name,
            group: d.teaching ? "Teaching" : "Support & leadership",
        })),
    ]
    const staffOpts: SelectOption[] = useMemo(
        () => analysis.list.map((e) => ({ value: String(e.id), label: e.name, sub: `${e.role} · ${locationOf(e.location).short}` })),
        [analysis.list],
    )

    const parts = [
        f.location === "all" ? "All locations" : locationOf(f.location).name,
        f.dept === "all" ? "all departments" : deptOf(f.dept).name,
        f.role === "all" ? "teaching & support staff" : f.role === "teaching" ? "teaching staff" : "support staff",
    ]

    return (
        <div className="animate-fade border-line bg-bg/85 sticky top-16 z-20 -mx-4 mb-5 border-b px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <FilterSelect label="Location" icon={<Building2 />} value={f.location} options={locOpts} onChange={setLocation} />
                <FilterSelect label="Department" icon={<Briefcase />} value={f.dept} options={deptOpts} onChange={setDept} />
                <FilterSelect
                    label="Staff member"
                    icon={<Search />}
                    value=""
                    options={staffOpts}
                    onChange={(id) => router.push(`/hr/staff/${id}`)}
                    searchable
                    placeholder="Search by name…"
                    className="col-span-2 md:col-span-1"
                />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted flex min-w-0 items-center gap-1.5 text-[12px]">
                    <Users className="size-3.5 shrink-0" />
                    <span className="truncate">
                        Showing <b className="text-ink">{fmt(analysis.n)}</b> staff · {parts.join(" · ")} ·{" "}
                        <b className="text-ink-2">{periodLong(f.w0)}</b>
                    </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div>
                        <Segmented
                            size="sm"
                            label="Role"
                            value={f.role}
                            onChange={setRole}
                            options={[
                                { value: "all", label: "All" },
                                { value: "teaching", label: "Teaching" },
                                { value: "support", label: "Support" },
                            ]}
                        />
                    </div>
                    <div>
                        <Segmented
                            size="sm"
                            label="Period"
                            value={f.w0}
                            onChange={setPeriod}
                            options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
                        />
                    </div>
                    <Button onClick={reset} size="sm" aria-label="Reset filters">
                        <RotateCcw className="size-3.5" /> Reset
                    </Button>
                </div>
            </div>
        </div>
    )
}
