"use client"

import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { Avatar } from "@/components/ui/avatar"
import { Meter } from "@/components/ui/meter"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { AS_OF } from "@/lib/data-source"
import { money, pct, ratio, shortDate } from "@/lib/format"
import { schoolOf, secName, ygName } from "@/platforms/edu/data/constants"
import { ArrowLeft, ArrowUpRight, BadgePercent, CalendarClock, CircleDollarSign, HandCoins, Receipt } from "lucide-react"
import Link from "next/link"
import { accountMetricsFor, invoicePaid } from "../../analytics"
import { ACCOUNT_STATUS, collectionTone } from "../../components/widgets"
import { discountOf, PAYER_LABEL, termOf } from "../../data/constants"
import { useFinData } from "../../hooks"

export function AccountProfileScreen({ id }: { id: number }) {
    const { data } = useFinData()
    if (!data) return <ScreenSkeleton />
    const acc = data.accounts.find((x) => x.id === id)
    if (!acc)
        return (
            <Empty>
                Fee account not found.{" "}
                <Link href="/fin/accounts" className="text-primary ml-1 font-semibold">
                    Back to accounts
                </Link>
            </Empty>
        )

    const m = accountMetricsFor(acc)
    const st = ACCOUNT_STATUS[m.status]
    const rate = ratio(m.paid, m.billed)

    // running statement: invoices raise the balance, payments bring it down
    const entries = acc.invoices
        .flatMap((inv) => [
            { date: inv.issued, label: `Invoice · ${termOf(inv.term).label}`, amount: inv.total, kind: "inv" as const },
            ...inv.payments.map((p) => ({ date: p.date, label: `Payment · ${p.method}`, amount: -p.amount, kind: "pay" as const })),
        ])
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    const statement = entries.reduce<((typeof entries)[number] & { balance: number })[]>(
        (rows, e) => [...rows, { ...e, balance: (rows.at(-1)?.balance ?? 0) + e.amount }],
        [],
    )

    return (
        <div className="space-y-4">
            <Link
                href="/fin/accounts"
                className="animate-fade text-muted hover:text-primary inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
            >
                <ArrowLeft className="size-4" /> Back to accounts
            </Link>
            <section className="animate-rise border-line bg-surface shadow-card flex flex-wrap items-center gap-4 rounded-2xl border p-5">
                <Avatar name={acc.name} seed={acc.id} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-ink text-[24px] leading-tight font-semibold">{acc.name}</h1>
                        <Pill tone={st.tone} dot>
                            {st.label}
                        </Pill>
                    </div>
                    <div className="text-ink-2 mt-0.5 text-[13px]">
                        {ygName(acc.yg)} · Class {secName(acc.yg, acc.sec)} · {schoolOf(acc.school).name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {[acc.stage, PAYER_LABEL[acc.profile], acc.transport ? "School transport" : "No transport"].map((c) => (
                            <Pill key={c}>{c}</Pill>
                        ))}
                        {acc.discount && (
                            <Pill tone="auth">
                                {discountOf(acc.discount).label} · {pct(discountOf(acc.discount).rate * 100, 0)} off tuition
                            </Pill>
                        )}
                        <Link href={`/edu/students/${acc.id}`}>
                            <Pill tone="info" className="hover:bg-primary/15 gap-1 transition-colors">
                                Student profile <ArrowUpRight className="size-3" />
                            </Pill>
                        </Link>
                    </div>
                </div>
                <div className="text-muted text-right text-[11.5px]">Statement to {shortDate(AS_OF)}</div>
            </section>

            <KpiGrid>
                <Kpi
                    label="Billed (FY 2026)"
                    icon={<Receipt />}
                    color="var(--c1)"
                    value={money(m.billed)}
                    foot={
                        <span>
                            {acc.invoices.length} {acc.invoices.length === 1 ? "invoice" : "invoices"}
                        </span>
                    }
                />
                <Kpi
                    label="Paid"
                    icon={<HandCoins />}
                    color={`var(--${collectionTone(rate)})`}
                    value={money(m.paid)}
                    foot={<Meter value={rate} color={`var(--${collectionTone(rate)})`} className="flex-1" />}
                />
                <Kpi
                    label="Balance"
                    icon={<CircleDollarSign />}
                    color={m.balance >= 1 ? "var(--warn)" : "var(--good)"}
                    value={m.balance >= 1 ? money(m.balance) : "Settled"}
                    foot={<span>{m.overdue >= 1 ? `${money(m.overdue)} overdue` : "nothing overdue"}</span>}
                />
                <Kpi
                    label="Days overdue"
                    icon={<CalendarClock />}
                    color={m.daysOverdue > 60 ? "var(--bad)" : m.daysOverdue ? "var(--warn)" : "var(--good)"}
                    value={m.daysOverdue ? String(m.daysOverdue) : "–"}
                    foot={<span>{m.lastPayment ? `last payment ${shortDate(m.lastPayment)}` : "no payments yet"}</span>}
                />
                <Kpi
                    label="Discount"
                    icon={<BadgePercent />}
                    color="var(--auth)"
                    value={money(m.discount)}
                    foot={<span>{acc.discount ? discountOf(acc.discount).label : "none applied"}</span>}
                />
            </KpiGrid>

            <Grid>
                <Panel span={8} title="Invoices" subtitle="Each term's charges, instalments and payments">
                    <div className="space-y-3">
                        {[...acc.invoices].reverse().map((inv) => {
                            const paid = invoicePaid(inv)
                            const left = inv.total - paid
                            let covered = paid
                            return (
                                <div key={inv.term} className="border-line bg-surface-2 rounded-xl border p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <b className="text-ink text-[13.5px] font-semibold">{termOf(inv.term).label}</b>
                                            <span className="text-muted ml-2 text-[11.5px]">issued {shortDate(inv.issued)}</span>
                                        </div>
                                        <Pill tone={left < 1 ? "good" : inv.instalments.some((i) => i.due < AS_OF) ? "warn" : "info"}>
                                            {left < 1 ? "Paid" : `${money(left)} open`}
                                        </Pill>
                                    </div>
                                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                                        <ul className="space-y-1 text-[12.5px]">
                                            {[
                                                ["Tuition", inv.lines.tuition],
                                                ["Resources", inv.lines.resources],
                                                ["Transport", inv.lines.transport],
                                                ["Discount", -inv.discount],
                                            ]
                                                .filter(([, v]) => v)
                                                .map(([k, v]) => (
                                                    <li key={k} className="flex justify-between">
                                                        <span className="text-ink-2">{k}</span>
                                                        <span className="tabular text-ink-2">{money(Number(v))}</span>
                                                    </li>
                                                ))}
                                            <li className="border-line mt-1 flex justify-between border-t pt-1.5">
                                                <b className="text-ink font-semibold">Total</b>
                                                <b className="tabular text-ink font-semibold">{money(inv.total)}</b>
                                            </li>
                                        </ul>
                                        <div className="space-y-2">
                                            <div className="eyebrow">{inv.instalments.length > 1 ? "Instalment plan" : "Due"}</div>
                                            <ul className="space-y-1 text-[12.5px]">
                                                {inv.instalments.map((ins, i) => {
                                                    const open = Math.max(0, ins.amount - covered)
                                                    covered = Math.max(0, covered - ins.amount)
                                                    const late = open > 0 && ins.due < AS_OF
                                                    return (
                                                        <li key={i} className="flex items-center justify-between gap-2">
                                                            <span className="text-ink-2">
                                                                {shortDate(ins.due)} · {money(ins.amount)}
                                                            </span>
                                                            <Pill tone={open <= 0 ? "good" : late ? "bad" : "info"}>
                                                                {open <= 0 ? "Paid" : late ? "Overdue" : "Not due"}
                                                            </Pill>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Panel>
                <Panel span={4} title="Statement" subtitle="Every charge and payment this year">
                    <ul className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
                        {statement.map((e, i) => (
                            <li key={i} className="bg-surface-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px]">
                                <i className="size-2 rounded-full" style={{ background: e.kind === "inv" ? "var(--c1)" : "var(--good)" }} />
                                <span className="min-w-0 flex-1">
                                    <b className="text-ink block truncate font-semibold">{e.label}</b>
                                    <span className="text-muted">{shortDate(e.date)}</span>
                                </span>
                                <span className="text-right">
                                    <b className={`tabular block font-semibold ${e.kind === "pay" ? "text-good-ink" : "text-ink"}`}>
                                        {e.kind === "pay" ? "−" : "+"}
                                        {money(Math.abs(e.amount))}
                                    </b>
                                    <span className="tabular text-muted text-[11px]">bal. {money(e.balance)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Note className="mt-3">
                        Payer profile: <b>{PAYER_LABEL[acc.profile]}</b>. Payments settle the earliest instalment first.
                    </Note>
                </Panel>
            </Grid>
        </div>
    )
}
