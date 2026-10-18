"use client"

import { type Column, DataTable } from "@/components/insights/data-table"
import { SearchInput } from "@/components/insights/search-input"
import { Avatar } from "@/components/ui/avatar"
import { Empty, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { fmt, money } from "@/lib/format"
import { schoolOf, secName } from "@/platforms/edu/data/constants"
import type { ScoredAccount } from "../../analytics"
import { FinPage } from "../../components/fin-page"
import { ACCOUNT_STATUS } from "../../components/widgets"
import { type AccountStatus, discountOf } from "../../data/constants"
import { useFin } from "../../state"

const STATUS_ORDER: Record<AccountStatus, number> = { arrears: 0, overdue: 1, current: 2, paid: 3 }

const COLUMNS: Column<ScoredAccount>[] = [
    {
        key: "name",
        header: "Student",
        sort: (a) => a.name,
        render: (a) => (
            <span className="flex items-center gap-3">
                <Avatar name={a.name} seed={a.id} size="sm" />
                <span className="min-w-0">
                    <b className="text-ink group-hover:text-primary block truncate font-semibold">{a.name}</b>
                    <span className="text-muted block truncate text-[11.5px]">
                        {a.discount ? discountOf(a.discount).label : "No discount"}
                        {a.transport ? " · Transport" : ""}
                    </span>
                </span>
            </span>
        ),
    },
    {
        key: "school",
        header: "School · Class",
        sort: (a) => a.school + a.yg + a.sec,
        render: (a) => (
            <span className="text-ink-2 whitespace-nowrap">
                {schoolOf(a.school).short} · {secName(a.yg, a.sec)}
            </span>
        ),
    },
    {
        key: "billed",
        header: "Billed",
        align: "right",
        sort: (a) => a.m.billed,
        render: (a) => <span className="tabular text-ink-2">{money(a.m.billed)}</span>,
    },
    {
        key: "paid",
        header: "Paid",
        align: "right",
        sort: (a) => a.m.paid,
        render: (a) => <span className="tabular text-ink-2">{money(a.m.paid)}</span>,
    },
    {
        key: "balance",
        header: "Balance",
        align: "right",
        sort: (a) => a.m.balance,
        render: (a) => <b className="tabular text-ink font-semibold">{a.m.balance >= 1 ? money(a.m.balance) : "–"}</b>,
    },
    {
        key: "days",
        header: "Days overdue",
        align: "right",
        sort: (a) => a.m.daysOverdue,
        render: (a) => <span className="tabular text-ink-2">{a.m.daysOverdue || "–"}</span>,
    },
    {
        key: "status",
        header: "Status",
        sort: (a) => STATUS_ORDER[a.m.status],
        render: (a) => (
            <Pill tone={ACCOUNT_STATUS[a.m.status].tone} dot>
                {ACCOUNT_STATUS[a.m.status].label}
            </Pill>
        ),
    },
]

export function FinAccountsScreen() {
    const reg = useFin((s) => s.register)
    const setRegister = useFin((s) => s.setRegister)
    return (
        <FinPage title="Fee Accounts" description="Every student fee account in the current filter. Click a row to open the statement.">
            {({ a, f }) => {
                if (f.location === "HQ") return <Empty>The head office has no fee accounts. Choose a school or All locations.</Empty>
                const q = reg.q.trim().toLowerCase()
                const rows = a.list.filter(
                    (x) =>
                        (!q || x.name.toLowerCase().includes(q) || secName(x.yg, x.sec).toLowerCase().includes(q)) &&
                        (reg.status === "all" || x.m.status === reg.status),
                )
                const c = a.fees.statusCount
                return (
                    <Panel
                        title="Account register"
                        subtitle={`${fmt(rows.length)} accounts`}
                        action={
                            <Segmented
                                label="Status"
                                size="sm"
                                value={reg.status}
                                onChange={(status) => setRegister({ status })}
                                options={[
                                    { value: "all", label: `All ${fmt(a.n)}` },
                                    { value: "paid", label: `Paid ${fmt(c.paid)}` },
                                    { value: "current", label: `Current ${fmt(c.current)}` },
                                    { value: "overdue", label: `Overdue ${fmt(c.overdue)}` },
                                    { value: "arrears", label: `Arrears ${fmt(c.arrears)}` },
                                ]}
                            />
                        }
                    >
                        <div className="mb-3">
                            <SearchInput value={reg.q} onChange={(v) => setRegister({ q: v })} placeholder="Search student or class" />
                        </div>
                        <DataTable
                            rows={rows}
                            columns={COLUMNS}
                            sort={reg.sort}
                            dir={reg.dir}
                            page={reg.page}
                            onSort={(sort, dir) => setRegister({ sort, dir })}
                            onPage={(page) => useFin.setState((s) => ({ register: { ...s.register, page } }))}
                            href={(x) => `/fin/accounts/${x.id}`}
                            rowKey={(x) => x.id}
                            empty="No accounts match these filters."
                        />
                        <Note className="mt-4">
                            Billed and paid cover invoices issued in the period; the balance covers every open invoice. <b>In arrears</b>{" "}
                            means more than 60 days overdue or a previous term still unpaid; <b>Overdue</b> means an instalment is past due;{" "}
                            <b>Current</b> means the balance is not yet due.
                        </Note>
                    </Panel>
                )
            }}
        </FinPage>
    )
}
