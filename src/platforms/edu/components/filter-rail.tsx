"use client"

import { Button } from "@/components/ui/button"
import { FilterSelect, type SelectOption } from "@/components/ui/filter-select"
import { Segmented } from "@/components/ui/segmented"
import { periodLong, PERIODS } from "@/lib/calendar"
import { fmt } from "@/lib/format"
import { Layers, RotateCcw, School, Search, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import type { EduAnalysis } from "../analytics"
import { schoolOf, SCHOOLS, secName, STAGES, ygName, YGS } from "../data/constants"
import type { EduDataset } from "../data/types"
import { useEdu } from "../state"

export function EduFilterRail({
    data,
    analysis,
    showStudentPicker = true,
}: {
    data: EduDataset
    analysis: EduAnalysis
    showStudentPicker?: boolean
}) {
    const router = useRouter()
    const { filters: f, setSchool, setStage, setYg, setSec, setGender, setPeriod, reset } = useEdu()
    const intake = f.school === "all" ? "Co-educational" : schoolOf(f.school).intake

    const schoolOpts: SelectOption[] = [
        { value: "all", label: "All schools", sub: `${SCHOOLS.length} schools` },
        ...SCHOOLS.map((s) => ({ value: s.id, label: s.name, sub: s.intake })),
    ]
    const stageOpts: SelectOption[] = [{ value: "all", label: "All stages" }, ...STAGES.map((s) => ({ value: s, label: s }))]
    const ygOpts: SelectOption[] = [
        { value: "all", label: "All year groups" },
        ...YGS.filter((y) => f.stage === "all" || y[1] === f.stage).map(([code, stage]) => ({
            value: code,
            label: ygName(code),
            group: stage,
        })),
    ]
    const secOpts: SelectOption[] = useMemo(() => {
        if (f.yg === "all") return [{ value: "all", label: "All sections" }]
        const letters = [
            ...new Set(data.sections.filter((x) => x.yg === f.yg && (f.school === "all" || x.school === f.school)).map((x) => x.sec)),
        ].sort()
        return [{ value: "all", label: "All sections" }, ...letters.map((l) => ({ value: l, label: `Section ${secName(f.yg, l)}` }))]
    }, [data, f.yg, f.school])
    const studentOpts: SelectOption[] = useMemo(
        () =>
            analysis.list.map((s) => ({
                value: String(s.id),
                label: s.name,
                sub: `${secName(s.yg, s.sec)} · ${schoolOf(s.school).short}`,
            })),
        [analysis.list],
    )

    const parts = [
        f.school === "all" ? "All schools" : schoolOf(f.school).name,
        f.stage === "all" ? "all stages" : f.stage,
        f.yg === "all" ? "all year groups" : f.sec === "all" ? ygName(f.yg) : secName(f.yg, f.sec),
        f.gender === "all" ? "boys & girls" : f.gender === "M" ? "boys" : "girls",
    ]

    return (
        <div className="animate-fade border-line bg-bg/85 sticky top-16 z-20 -mx-4 mb-5 border-b px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1.35fr]">
                <FilterSelect label="School" icon={<School />} value={f.school} options={schoolOpts} onChange={setSchool} />
                <FilterSelect label="Stage" icon={<Layers />} value={f.stage} options={stageOpts} onChange={setStage} />
                <FilterSelect label="Year group" value={f.yg} options={ygOpts} onChange={setYg} />
                <FilterSelect label="Section" value={f.sec} options={secOpts} onChange={setSec} disabled={f.yg === "all"} />
                {showStudentPicker && (
                    <FilterSelect
                        label="Student"
                        icon={<Search />}
                        value=""
                        options={studentOpts}
                        onChange={(id) => router.push(`/edu/students/${id}`)}
                        searchable
                        placeholder="Search by name…"
                        className="col-span-2 md:col-span-4 xl:col-span-1"
                    />
                )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted flex min-w-0 items-center gap-1.5 text-[12px]">
                    <Users className="size-3.5 shrink-0" />
                    <span className="truncate">
                        Showing <b className="text-ink">{fmt(analysis.n)}</b> students · {parts.join(" · ")} ·{" "}
                        <b className="text-ink-2">{periodLong(f.w0)}</b>
                    </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div>
                        <Segmented
                            size="sm"
                            label="Gender"
                            value={f.gender}
                            onChange={setGender}
                            options={[
                                { value: "all", label: "All" },
                                { value: "M", label: "Boys", disabled: intake === "Girls" },
                                { value: "F", label: "Girls", disabled: intake === "Boys" },
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
