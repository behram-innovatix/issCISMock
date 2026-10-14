"use client"

import { type Column, DataTable } from "@/components/insights/data-table"
import { SearchInput } from "@/components/insights/search-input"
import { Avatar } from "@/components/ui/avatar"
import { Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { fmt, pct, score } from "@/lib/format"
import { STATUS_LABEL, statusOf } from "@/lib/status"
import { X } from "lucide-react"
import type { ScoredEmployee } from "../../analytics"
import { HrPage } from "../../components/hr-page"
import { RATING_TONE } from "../../components/widgets"
import { deptOf, locationOf } from "../../data/constants"
import { useHr } from "../../state"

const perfBand = (s: number) => (s >= 4 ? 0 : s >= 3.25 ? 1 : 2)
const attBand = (a: number) => (a >= 95 ? 0 : a >= 90 ? 1 : 2)

const COLUMNS: Column<ScoredEmployee>[] = [
    {
        key: "name",
        header: "Staff member",
        sort: (e) => e.name.replace(/^(Mr\.|Ms\.)\s+/, ""),
        render: (e) => (
            <span className="flex items-center gap-3">
                <Avatar name={e.name} seed={e.id} size="sm" />
                <span className="min-w-0">
                    <b className="text-ink group-hover:text-primary block truncate font-semibold">{e.name}</b>
                    <span className="text-muted block truncate text-[11.5px]">{e.role}</span>
                </span>
            </span>
        ),
    },
    {
        key: "dept",
        header: "Department",
        sort: (e) => deptOf(e.dept).name,
        render: (e) => <span className="text-ink-2">{deptOf(e.dept).name}</span>,
    },
    {
        key: "location",
        header: "Location",
        sort: (e) => e.location,
        render: (e) => <span className="text-ink-2 whitespace-nowrap">{locationOf(e.location).short}</span>,
    },
    {
        key: "att",
        header: "Attendance",
        align: "right",
        sort: (e) => e.m.att,
        render: (e) => <Pill tone={statusOf(e.m.att)}>{pct(e.m.att)}</Pill>,
    },
    {
        key: "late",
        header: "Late days",
        align: "right",
        sort: (e) => e.m.late,
        render: (e) => <span className="tabular text-ink-2">{e.m.late}</span>,
    },
    {
        key: "leave",
        header: "Absent days",
        align: "right",
        sort: (e) => e.m.sick + e.m.emergency + e.m.unauth,
        render: (e) => <span className="tabular text-ink-2">{e.m.sick + e.m.emergency + e.m.unauth}</span>,
    },
    {
        key: "kpi",
        header: "KPI attainment",
        align: "right",
        sort: (e) => e.m.kpi,
        render: (e) => <span className="tabular text-ink-2">{pct(e.m.kpi, 0)}</span>,
    },
    {
        key: "appraisal",
        header: "Appraisal",
        align: "right",
        sort: (e) => e.m.appraisal ?? -1,
        render: (e) =>
            e.m.appraisal == null ? (
                <span className="text-muted text-[12px]">New starter</span>
            ) : (
                <Pill tone={RATING_TONE[e.m.rating!]}>
                    {score(e.m.appraisal)} · {e.m.rating}
                </Pill>
            ),
    },
    {
        key: "status",
        header: "Status",
        sort: (e) => (e.m.status === "bad" ? 0 : e.m.status === "warn" ? 1 : 2),
        render: (e) => (
            <Pill tone={e.m.status} dot>
                {STATUS_LABEL[e.m.status]}
            </Pill>
        ),
    },
]

export function HrStaffScreen() {
    const reg = useHr((s) => s.register)
    const setRegister = useHr((s) => s.setRegister)
    return (
        <HrPage title="Staff" description="Every staff member in the current filter. Click a row to open their profile.">
            {({ a }) => {
                const q = reg.q.trim().toLowerCase()
                const rows = a.list.filter(
                    (e) =>
                        (!q ||
                            e.name.toLowerCase().includes(q) ||
                            e.role.toLowerCase().includes(q) ||
                            deptOf(e.dept).name.toLowerCase().includes(q)) &&
                        (reg.status === "all" || e.m.status === reg.status) &&
                        (!reg.box || (e.m.appraisal != null && perfBand(e.m.appraisal) === reg.box.r && attBand(e.m.att) === reg.box.c)),
                )
                const counts = { good: 0, warn: 0, bad: 0 }
                for (const e of a.list) counts[e.m.status]++
                return (
                    <Panel
                        title="Staff register"
                        subtitle={`${fmt(rows.length)} staff`}
                        action={
                            <Segmented
                                label="Status"
                                size="sm"
                                value={reg.status}
                                onChange={(status) => setRegister({ status })}
                                options={[
                                    { value: "all", label: `All ${fmt(a.n)}` },
                                    { value: "good", label: `On track ${fmt(counts.good)}` },
                                    { value: "warn", label: `Watch ${fmt(counts.warn)}` },
                                    { value: "bad", label: `At risk ${fmt(counts.bad)}` },
                                ]}
                            />
                        }
                    >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <SearchInput
                                value={reg.q}
                                onChange={(v) => setRegister({ q: v })}
                                placeholder="Search name, role or department"
                            />
                            {reg.box && (
                                <span className="bg-primary-soft text-primary inline-flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-[12px] font-semibold">
                                    {reg.box.label}
                                    <button
                                        type="button"
                                        onClick={() => setRegister({ box: null })}
                                        className="hover:bg-primary/10 rounded-full p-0.5"
                                        aria-label="Clear matrix filter"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </span>
                            )}
                        </div>
                        <DataTable
                            rows={rows}
                            columns={COLUMNS}
                            sort={reg.sort}
                            dir={reg.dir}
                            page={reg.page}
                            onSort={(sort, dir) => setRegister({ sort, dir })}
                            onPage={(page) => useHr.setState((s) => ({ register: { ...s.register, page } }))}
                            href={(e) => `/hr/staff/${e.id}`}
                            rowKey={(e) => e.id}
                            empty="No staff match these filters."
                        />
                        <Note className="mt-4">
                            Status: <b>At risk</b> if attendance is below 90% or the latest appraisal is below 2.75; <b>Watch</b> if
                            attendance is below 95% or the appraisal is below 3.4; otherwise <b>On track</b>. Attendance excludes approved
                            annual leave.
                        </Note>
                    </Panel>
                )
            }}
        </HrPage>
    )
}
