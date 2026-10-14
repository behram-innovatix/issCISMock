"use client"

import { type Column, DataTable } from "@/components/insights/data-table"
import { SearchInput } from "@/components/insights/search-input"
import { Avatar } from "@/components/ui/avatar"
import { Panel } from "@/components/ui/panel"
import { Note } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { fmt, pct, signed } from "@/lib/format"
import { STATUS_LABEL, statusOf } from "@/lib/status"
import { X } from "lucide-react"
import { attBand, behBand, type ScoredStudent } from "../../analytics"
import { EduPage } from "../../components/edu-page"
import { schoolOf, secName, YG_ORDER } from "../../data/constants"
import { type SortKey, useEdu } from "../../state"

const COLUMNS: Column<ScoredStudent>[] = [
    {
        key: "name",
        header: "Student",
        sort: (s) => s.name,
        render: (s) => (
            <span className="flex items-center gap-3">
                <Avatar name={s.name} seed={s.id} size="sm" />
                <span className="min-w-0">
                    <b className="text-ink group-hover:text-primary block truncate font-semibold">{s.name}</b>
                    <span className="text-muted block truncate text-[11.5px]">{schoolOf(s.school).short}</span>
                </span>
            </span>
        ),
    },
    {
        key: "yg",
        header: "Year · Section",
        sort: (s) => YG_ORDER[s.yg] * 10 + s.sec.charCodeAt(0),
        render: (s) => <span className="text-ink-2 font-semibold">{secName(s.yg, s.sec)}</span>,
    },
    { key: "house", header: "House", sort: (s) => s.house, render: (s) => <span className="text-ink-2">{s.house}</span> },
    {
        key: "att",
        header: "Attendance",
        align: "right",
        sort: (s) => s.m.att,
        render: (s) => <Pill tone={statusOf(s.m.att)}>{pct(s.m.att)}</Pill>,
    },
    {
        key: "late",
        header: "Lates",
        align: "right",
        sort: (s) => s.m.l,
        render: (s) => <span className="tabular text-ink-2">{s.m.l}</span>,
    },
    {
        key: "ach",
        header: "Achievement",
        align: "right",
        sort: (s) => s.m.ach,
        render: (s) => <span className="tabular text-good-ink font-semibold">+{s.m.ach}</span>,
    },
    {
        key: "inc",
        header: "Incident",
        align: "right",
        sort: (s) => s.m.inc,
        render: (s) => <span className="tabular text-bad-ink font-semibold">{s.m.inc ? `−${s.m.inc}` : "0"}</span>,
    },
    {
        key: "net",
        header: "Net",
        align: "right",
        sort: (s) => s.m.net,
        render: (s) => <span className="tabular text-ink font-bold">{signed(s.m.net)}</span>,
    },
    {
        key: "ratio",
        header: "Positive",
        sort: (s) => s.m.ratio,
        render: (s) => (
            <span className="flex items-center gap-2">
                <span className="bg-bad-soft h-1.5 w-16 overflow-hidden rounded-full">
                    <i className="bg-good block h-full rounded-full" style={{ width: `${s.m.ratio}%` }} />
                </span>
                <span className="tabular text-muted text-[11.5px]">{pct(s.m.ratio, 0)}</span>
            </span>
        ),
    },
    {
        key: "status",
        header: "Status",
        sort: (s) => (s.m.status === "bad" ? 0 : s.m.status === "warn" ? 1 : 2),
        render: (s) => (
            <Pill tone={s.m.status} dot>
                {STATUS_LABEL[s.m.status]}
            </Pill>
        ),
    },
]

export function EduStudentsScreen() {
    const reg = useEdu((s) => s.register)
    const setRegister = useEdu((s) => s.setRegister)
    return (
        <EduPage title="Students" description="The student register for the current filter. Click a student to open their profile.">
            {({ a }) => {
                const q = reg.q.trim().toLowerCase()
                const rows = a.list.filter(
                    (s) =>
                        (!q ||
                            s.name.toLowerCase().includes(q) ||
                            secName(s.yg, s.sec).toLowerCase().includes(q) ||
                            s.house.toLowerCase().includes(q)) &&
                        (reg.status === "all" || s.m.status === reg.status) &&
                        (!reg.cell || (attBand(s.m) === reg.cell.ai && behBand(s.m) === reg.cell.bi)),
                )
                const counts = { good: 0, warn: 0, bad: 0 }
                for (const s of a.list) counts[s.m.status]++
                return (
                    <Panel
                        title="Register"
                        subtitle={`${fmt(rows.length)} students`}
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
                                placeholder="Search name, section or house"
                            />
                            {reg.cell && (
                                <span className="bg-primary-soft text-primary inline-flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-[12px] font-semibold">
                                    {reg.cell.label}
                                    <button
                                        type="button"
                                        onClick={() => setRegister({ cell: null })}
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
                            onSort={(sort, dir) => setRegister({ sort: sort as SortKey, dir })}
                            onPage={(page) => useEdu.setState((s) => ({ register: { ...s.register, page } }))}
                            href={(s) => `/edu/students/${s.id}`}
                            rowKey={(s) => s.id}
                            empty="No students match these filters."
                        />
                        <Note className="mt-4">
                            Status: <b>At risk</b> if attendance is below 90% or net behaviour points are −10 or lower; <b>Watch</b> if
                            attendance is below 95% or net points are below zero; otherwise <b>On track</b>.
                        </Note>
                    </Panel>
                )
            }}
        </EduPage>
    )
}
