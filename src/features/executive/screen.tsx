"use client"

import { Sparkline, TrendChart } from "@/components/charts/charts"
import { Legend } from "@/components/insights/legend"
import { Avatar } from "@/components/ui/avatar"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shell/page-header"
import { TERM_LABEL } from "@/lib/calendar"
import { cn } from "@/lib/cn"
import { fmt, pct, score, signed } from "@/lib/format"
import { ATT_LABEL, statusOf, type Tone } from "@/lib/status"
import { analyseEdu, DEFAULT_EDU_FILTERS, type EduAnalysis } from "@/platforms/edu/analytics"
import { SCHOOLS, schoolOf, secName } from "@/platforms/edu/data/constants"
import { useEduData } from "@/platforms/edu/hooks"
import { analyseHr, DEFAULT_HR_FILTERS, type HrAnalysis } from "@/platforms/hr/analytics"
import { locationOf, ratingOf } from "@/platforms/hr/data/constants"
import { useHrData } from "@/platforms/hr/hooks"
import { PLATFORMS, type PlatformDefinition } from "@/platforms/registry"
import { ArrowUpRight, Clock3 } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useMemo } from "react"

interface Headline {
    label: string
    value: ReactNode
    note: ReactNode
    tone?: Tone
    trend?: number[]
}

/** Headline metrics each platform contributes to the executive view, keyed by registry code. */
const HEADLINES: Record<string, (edu: EduAnalysis, hr: HrAnalysis) => Headline[]> = {
    edu: (a) => [
        { label: "Students", value: fmt(a.n), note: `${pct(a.util, 0)} of capacity` },
        { label: "Attendance", value: pct(a.att), note: ATT_LABEL[a.attTone], tone: a.attTone, trend: a.weeks.map((w) => w.att) },
        {
            label: "At risk",
            value: fmt(a.totals.atRisk),
            note: `${pct(a.n ? (a.totals.atRisk / a.n) * 100 : 0)} of students`,
            tone: a.totals.atRisk / (a.n || 1) < 0.08 ? "good" : a.totals.atRisk / (a.n || 1) < 0.15 ? "warn" : "bad",
        },
        {
            label: "Net behaviour",
            value: signed(a.totals.ACH - a.totals.INC),
            note: `${pct(a.totals.ACH + a.totals.INC ? (a.totals.ACH / (a.totals.ACH + a.totals.INC)) * 100 : 0, 0)} positive`,
            trend: a.behaviourWeeks.map((w) => w.ach + w.inc),
        },
    ],
    hr: (_, h) => [
        { label: "Staff", value: fmt(h.n), note: `${fmt(h.teaching)} teaching · ${fmt(h.support)} support` },
        {
            label: "Attendance",
            value: pct(h.att),
            note: ATT_LABEL[statusOf(h.att)],
            tone: statusOf(h.att),
            trend: h.weeks.map((w) => w.att),
        },
        {
            label: "Avg appraisal",
            value: `${score(h.avgAppraisal)} / 5`,
            note: ratingOf(h.avgAppraisal),
            tone: h.avgAppraisal >= 3.5 ? "good" : "warn",
        },
        {
            label: "At risk",
            value: fmt(h.atRisk),
            note: `${fmt(h.watch)} more on watch`,
            tone: h.atRisk / (h.n || 1) < 0.05 ? "good" : h.atRisk / (h.n || 1) < 0.1 ? "warn" : "bad",
        },
    ],
}

export function ExecutiveOverviewScreen() {
    const { data: eduData } = useEduData()
    const { data: hrData } = useHrData()
    const all = useMemo(() => {
        if (!eduData || !hrData) return null
        const edu = analyseEdu(eduData, DEFAULT_EDU_FILTERS)
        const hr = analyseHr(hrData, DEFAULT_HR_FILTERS)
        const schools = SCHOOLS.map((s) => {
            const e = analyseEdu(eduData, { ...DEFAULT_EDU_FILTERS, school: s.id })
            const h = analyseHr(hrData, { ...DEFAULT_HR_FILTERS, location: s.id })
            return { s, e, h }
        })
        return { edu, hr, schools }
    }, [eduData, hrData])

    return (
        <>
            <PageHeader
                eyebrow={`Executive Overview · ${TERM_LABEL}`}
                title={
                    <>
                        Organisation <span className="text-gradient">at a glance</span>
                    </>
                }
                description="Headline performance from every connected platform. Open a platform for the full picture."
            />
            {!all ? (
                <ScreenSkeleton />
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        {PLATFORMS.filter((p) => p.status === "live").map((p) => (
                            <PlatformStrip key={p.code} p={p} items={HEADLINES[p.code]?.(all.edu, all.hr) ?? []} />
                        ))}
                    </div>
                    <Grid>
                        <Panel
                            span={8}
                            title="Attendance: students vs staff"
                            subtitle="Weekly attendance across the organisation"
                            action={
                                <Legend
                                    items={[
                                        { label: "Students", color: "var(--c1)" },
                                        { label: "Staff", color: "var(--c2)" },
                                    ]}
                                />
                            }
                        >
                            <TrendChart
                                height={420}
                                data={all.edu.weeks.map((w, i) => ({ label: w.label, students: w.att, staff: all.hr.weeks[i]?.att }))}
                                series={[
                                    { key: "students", label: "Students", color: "var(--c1)", fill: true },
                                    { key: "staff", label: "Staff", color: "var(--c2)", fill: true },
                                ]}
                                yDomain={[(min: number) => Math.max(0, Math.floor(Math.min(min, 90) - 2)), 100]}
                                yFormat={(v) => `${v}%`}
                                valueFormat={(v) => pct(v)}
                                target={{ value: 95, label: "Target 95%" }}
                                titlePrefix="Week of "
                            />
                        </Panel>
                        <Alerts edu={all.edu} hr={all.hr} />
                        <Panel span={12} title="School comparison" subtitle="Students and staff side by side for each school">
                            <div className="-mx-1 overflow-x-auto px-1">
                                <table className="w-full min-w-[860px] border-separate border-spacing-y-1 text-[13px]">
                                    <thead>
                                        <tr className="text-muted text-[10.5px] font-bold tracking-[.12em] uppercase">
                                            <th className="px-3 pb-1.5 text-left">School</th>
                                            <th className="px-3 pb-1.5 text-right">Students</th>
                                            <th className="px-3 pb-1.5 text-right">Student attendance</th>
                                            <th className="px-3 pb-1.5 text-right">Students at risk</th>
                                            <th className="px-3 pb-1.5 text-right">Net behaviour / student</th>
                                            <th className="px-3 pb-1.5 text-right">Staff</th>
                                            <th className="px-3 pb-1.5 text-right">Staff attendance</th>
                                            <th className="px-3 pb-1.5 text-right">Avg appraisal</th>
                                            <th className="px-3 pb-1.5 text-right">Students / teacher</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {all.schools.map(({ s, e, h }) => {
                                            const net = e.n ? (e.totals.ACH - e.totals.INC) / e.n : 0
                                            const cells = [
                                                fmt(e.n),
                                                <Pill key="a" tone={e.attTone}>
                                                    {pct(e.att)}
                                                </Pill>,
                                                <span key="r" className="tabular text-ink-2">
                                                    {fmt(e.totals.atRisk)}{" "}
                                                    <span className="text-muted">({pct(e.n ? (e.totals.atRisk / e.n) * 100 : 0, 0)})</span>
                                                </span>,
                                                <span
                                                    key="n"
                                                    className={cn("tabular font-semibold", net >= 0 ? "text-good-ink" : "text-bad-ink")}
                                                >
                                                    {net >= 0 ? "+" : "−"}
                                                    {Math.abs(net).toFixed(1)}
                                                </span>,
                                                fmt(h.n),
                                                <Pill key="s" tone={statusOf(h.att)}>
                                                    {pct(h.att)}
                                                </Pill>,
                                                <b key="p" className="tabular text-ink font-semibold">
                                                    {score(h.avgAppraisal)}
                                                </b>,
                                                <span key="t" className="tabular text-ink-2">
                                                    {h.teaching ? (e.n / h.teaching).toFixed(1) : "–"}
                                                </span>,
                                            ]
                                            return (
                                                <tr key={s.id} className="group">
                                                    <td className="bg-surface-2 group-hover:bg-primary-softer rounded-l-xl px-3 py-3 transition-colors">
                                                        <b className="text-ink block font-semibold">{s.name}</b>
                                                        <span className="text-muted text-[11.5px]">{s.intake}</span>
                                                    </td>
                                                    {cells.map((c, i) => (
                                                        <td
                                                            key={i}
                                                            className={cn(
                                                                "tabular bg-surface-2 text-ink-2 group-hover:bg-primary-softer px-3 py-3 text-right transition-colors",
                                                                i === cells.length - 1 && "rounded-r-xl",
                                                            )}
                                                        >
                                                            {c}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                        {PLATFORMS.filter((p) => p.status === "coming-soon").map((p) => (
                            <ComingSoon key={p.code} p={p} />
                        ))}
                    </Grid>
                </div>
            )}
        </>
    )
}

function PlatformStrip({ p, items }: { p: PlatformDefinition; items: Headline[] }) {
    const Icon = p.icon
    return (
        <section className="animate-rise border-line bg-surface shadow-card rounded-2xl border p-5">
            <header className="mb-4 flex items-center gap-3">
                <span
                    className="flex size-9 items-center justify-center rounded-xl [&>svg]:size-[18px]"
                    style={{ background: `color-mix(in srgb, ${p.accent} 12%, transparent)`, color: p.accent }}
                >
                    <Icon />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-ink text-[15px] font-semibold">{p.name}</h2>
                    <p className="text-muted truncate text-[12px]">{p.description}</p>
                </div>
                <Link
                    href={p.basePath}
                    className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[rgba(47,91,216,.12)]"
                >
                    Open <ArrowUpRight className="size-3.5" />
                </Link>
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {items.map((it) => (
                    <div key={it.label} className="bg-surface-2 rounded-xl p-3">
                        <div className="text-ink-2 truncate text-[11.5px] font-semibold">{it.label}</div>
                        <div className="tabular font-display text-ink mt-1 text-[21px] leading-tight font-semibold">{it.value}</div>
                        {it.trend ? (
                            <Sparkline data={it.trend} color={it.tone ? `var(--${it.tone})` : p.accent} height={28} />
                        ) : (
                            <div className="h-[28px]" />
                        )}
                        <div className="text-muted mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug">
                            {it.tone && (
                                <i className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ background: `var(--${it.tone})` }} />
                            )}
                            <span className={it.tone ? `font-semibold text-${it.tone}-ink` : undefined}>{it.note}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

function Alerts({ edu, hr }: { edu: EduAnalysis; hr: HrAnalysis }) {
    const students = edu.list
        .filter((s) => s.m.status === "bad")
        .sort((a, b) => a.m.att - b.m.att)
        .slice(0, 4)
        .map((s) => ({
            id: s.id,
            name: s.name,
            meta: `Student · ${secName(s.yg, s.sec)} · ${schoolOf(s.school).short}`,
            value: pct(s.m.att),
            reason: s.m.att < 90 ? "Persistent absence" : "Behaviour concern",
            href: `/edu/students/${s.id}`,
        }))
    const staff = hr.list
        .filter((e) => e.m.status === "bad")
        .sort((a, b) => a.m.att - b.m.att)
        .slice(0, 4)
        .map((e) => ({
            id: 100000 + e.id,
            name: e.name,
            meta: `${e.role} · ${locationOf(e.location).short}`,
            value: pct(e.m.att),
            reason: e.m.att < 90 ? "Low attendance" : "Low appraisal",
            href: `/hr/staff/${e.id}`,
        }))
    return (
        <Panel span={4} title="Alerts" subtitle={`${fmt(edu.totals.atRisk)} students and ${fmt(hr.atRisk)} staff flagged at risk`}>
            <div className="space-y-4">
                {[
                    { label: "Students", items: students, more: "/edu/students" },
                    { label: "Staff", items: staff, more: "/hr/staff" },
                ].map((g) => (
                    <div key={g.label}>
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="eyebrow">{g.label}</span>
                            <Link href={g.more} className="text-primary text-[11.5px] font-semibold hover:underline">
                                View all
                            </Link>
                        </div>
                        <ul className="space-y-0.5">
                            {g.items.map((it) => (
                                <li key={it.id}>
                                    <Link
                                        href={it.href}
                                        className="group hover:bg-primary-softer flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors"
                                    >
                                        <Avatar name={it.name} seed={it.id} size="sm" />
                                        <span className="min-w-0 flex-1">
                                            <b className="text-ink group-hover:text-primary block truncate text-[12.5px] font-semibold">
                                                {it.name}
                                            </b>
                                            <span className="text-muted block truncate text-[11px]">{it.meta}</span>
                                        </span>
                                        <span className="text-right">
                                            <b className="tabular text-bad-ink block text-[12.5px] font-bold">{it.value}</b>
                                            <span className="text-muted block text-[10.5px]">{it.reason}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Panel>
    )
}

function ComingSoon({ p }: { p: PlatformDefinition }) {
    const Icon = p.icon
    return (
        <section className="animate-rise border-line-strong bg-surface/60 col-span-12 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-5">
            <span
                className="flex size-10 items-center justify-center rounded-xl opacity-70 [&>svg]:size-5"
                style={{ background: `color-mix(in srgb, ${p.accent} 12%, transparent)`, color: p.accent }}
            >
                <Icon />
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="text-ink text-[14.5px] font-semibold">{p.name}</h2>
                <p className="text-muted text-[12.5px]">{p.description}. This platform will feed the CIS once it is connected.</p>
            </div>
            <Pill className="gap-1">
                <Clock3 className="size-3" /> Coming soon
            </Pill>
        </section>
    )
}
