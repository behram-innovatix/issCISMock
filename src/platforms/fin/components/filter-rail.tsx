"use client"

import { Button } from "@/components/ui/button"
import { FilterSelect, type SelectOption } from "@/components/ui/filter-select"
import { Segmented } from "@/components/ui/segmented"
import { fmt } from "@/lib/format"
import { type Stage, STAGES, schoolOf, secName } from "@/platforms/edu/data/constants"
import { LOCATIONS, locationOf } from "@/platforms/hr/data/constants"
import { Building2, Layers, RotateCcw, Search, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import type { FinAnalysis } from "../analytics"
import { FIN_PERIODS, finPeriodLong } from "../data/constants"
import type { FinDataset } from "../data/types"
import { useFin } from "../state"

export function FinFilterRail({ data, analysis }: { data: FinDataset; analysis: FinAnalysis }) {
    const router = useRouter()
    const { filters: f, setLocation, setStage, setPeriod, reset } = useFin()
    const hq = f.location === "HQ"

    const locOpts: SelectOption[] = [
        { value: "all", label: "All locations", sub: "3 schools + head office" },
        ...LOCATIONS.map((l) => ({ value: l.id, label: l.name, sub: l.id === "HQ" ? "Cost centre · no fee income" : undefined })),
    ]
    const stageOpts: SelectOption[] = [{ value: "all", label: "All stages" }, ...STAGES.map((s) => ({ value: s, label: s }))]
    const accountOpts: SelectOption[] = useMemo(
        () =>
            data.accounts
                .filter((a) => f.location === "all" || a.school === f.location)
                .map((a) => ({ value: String(a.id), label: a.name, sub: `${secName(a.yg, a.sec)} · ${schoolOf(a.school).short}` })),
        [data.accounts, f.location],
    )

    const parts = [
        f.location === "all" ? "All locations" : locationOf(f.location).name,
        hq ? "cost centre" : f.stage === "all" ? "all stages" : `${f.stage} stage`,
    ]

    return (
        <div className="animate-fade border-line bg-bg/85 sticky top-16 z-20 -mx-4 mb-5 border-b px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <FilterSelect label="Location" icon={<Building2 />} value={f.location} options={locOpts} onChange={setLocation} />
                <FilterSelect
                    label="Stage (fees)"
                    icon={<Layers />}
                    value={f.stage}
                    options={stageOpts}
                    onChange={(v) => setStage(v as "all" | Stage)}
                    disabled={hq}
                />
                <FilterSelect
                    label="Fee account"
                    icon={<Search />}
                    value=""
                    options={accountOpts}
                    onChange={(id) => router.push(`/fin/accounts/${id}`)}
                    searchable
                    disabled={!accountOpts.length}
                    placeholder="Search by student name…"
                    className="col-span-2 md:col-span-1"
                />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted flex min-w-0 items-center gap-1.5 text-[12px]">
                    <Wallet className="size-3.5 shrink-0" />
                    <span className="truncate">
                        Showing <b className="text-ink">{fmt(analysis.n)}</b> fee accounts · {parts.join(" · ")} ·{" "}
                        <b className="text-ink-2">{finPeriodLong(f.m0)}</b>
                    </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div>
                        <Segmented
                            size="sm"
                            label="Period"
                            value={f.m0}
                            onChange={setPeriod}
                            options={FIN_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
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
