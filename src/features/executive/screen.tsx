"use client"

import { Sparkline, TrendChart } from "@/components/charts/charts"
import { Legend } from "@/components/insights/legend"
import { Avatar } from "@/components/ui/avatar"
import { buttonClass } from "@/components/ui/button"
import { Grid, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { ScreenSkeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shell/page-header"
import { TERM_LABEL } from "@/lib/calendar"
import { cn } from "@/lib/cn"
import { fmt, money, pct, qar, score, signed } from "@/lib/format"
import { ATT_LABEL, statusOf, type Tone } from "@/lib/status"
import { analyseEdu, DEFAULT_EDU_FILTERS, type EduAnalysis } from "@/platforms/edu/analytics"
import { SCHOOLS, schoolOf, secName } from "@/platforms/edu/data/constants"
import { useEduData } from "@/platforms/edu/hooks"
import { analyseFin, DEFAULT_FIN_FILTERS, type FinAnalysis } from "@/platforms/fin/analytics"
import { collectionTone, signedPct, varianceTone } from "@/platforms/fin/components/widgets"
import { useFinData } from "@/platforms/fin/hooks"
import { analyseHr, DEFAULT_HR_FILTERS, type HrAnalysis } from "@/platforms/hr/analytics"
import { locationOf, ratingOf } from "@/platforms/hr/data/constants"
import { useHrData } from "@/platforms/hr/hooks"
import { PLATFORMS, type PlatformDefinition } from "@/platforms/registry"
import { ArrowUpRight, Cable, Clock3 } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useMemo } from "react"

interface Headline {
    label: string
    value: ReactNode
    note: ReactNode
    tone?: Tone
    trend?: number[]
}

/** The analyses of the platforms that have connected data; null for one that hasn't. */
interface Analyses {
    edu: EduAnalysis | null
    hr: HrAnalysis | null
    fin: FinAnalysis | null
}

/** Headline metrics each platform contributes to the executive view, keyed by registry code. */
const HEADLINES: { [K in keyof Analyses]: (a: NonNullable<Analyses[K]>) => Headline[] } = {
    edu: (a) => [
        { label: "Students", value: fmt(a.n), note: a.cap ? `${pct(a.util, 0)} of capacity` : `${fmt(a.secsIn.length)} sections` },
        {
            label: "Attendance",
            value: pct(a.att),
            note: ATT_LABEL[a.attTone],
            tone: a.attTone,
            trend: a.weeks.map((w) => w.att).filter((v): v is number => v !== null),
        },
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
    hr: (h) => [
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
    fin: (f) => [
        {
            label: "Income YTD",
            value: qar(f.income),
            note: `${qar(f.net)} net surplus`,
            trend: f.monthly.slice(0, -1).map((m) => Number(m.income)),
        },
        {
            label: "Fee collection",
            value: pct(f.fees.rate),
            note: `${pct(f.fees.currentCollected, 0)} of this term`,
            tone: collectionTone(f.fees.rate),
            trend: f.fees.curve.map((c) => c.collected),
        },
        {
            label: "Outstanding",
            value: qar(f.fees.outstanding),
            note: `${fmt(f.fees.arrears)} accounts in arrears`,
            tone: f.fees.arrears / (f.fees.n || 1) < 0.05 ? "good" : f.fees.arrears / (f.fees.n || 1) < 0.1 ? "warn" : "bad",
        },
        {
            label: "Budget variance",
            value: signedPct(f.budget.varPct),
            note: `${f.overBudget.length} lines over budget`,
            tone: varianceTone(f.budget.varPct),
            trend: f.monthly.map((m) => Number(m.actualCum) - Number(m.budgetCum)),
        },
    ],
}

const headlinesFor = (code: string, all: Analyses): Headline[] | null => {
    if (code === "edu") return all.edu && HEADLINES.edu(all.edu)
    if (code === "hr") return all.hr && HEADLINES.hr(all.hr)
    if (code === "fin") return all.fin && HEADLINES.fin(all.fin)
    return null
}

export function ExecutiveOverviewScreen() {
    const { data: eduData } = useEduData()
    const { data: hrData } = useHrData()
    const { data: finData } = useFinData()
    const all = useMemo(() => {
        if (!eduData || !hrData || !finData) return null
        const analyses: Analyses = {
            edu: eduData.meta.connected ? analyseEdu(eduData, DEFAULT_EDU_FILTERS) : null,
            hr: hrData.meta.connected ? analyseHr(hrData, DEFAULT_HR_FILTERS) : null,
            fin: finData.meta.connected ? analyseFin(finData, DEFAULT_FIN_FILTERS) : null,
        }
        const schools = SCHOOLS.map((s) => ({
            s,
            e: analyses.edu && analyseEdu(eduData, { ...DEFAULT_EDU_FILTERS, school: s.id }),
            h: analyses.hr && analyseHr(hrData, { ...DEFAULT_HR_FILTERS, location: s.id }),
            fn: analyses.fin && analyseFin(finData, { ...DEFAULT_FIN_FILTERS, location: s.id }),
        }))
        return { ...analyses, schools }
    }, [eduData, hrData, finData])

    const connected = all ? [all.edu, all.hr, all.fin].filter(Boolean).length : 0

    return (
        <>
            <PageHeader
                eyebrow={all?.edu && TERM_LABEL ? `Executive Overview · ${TERM_LABEL}` : "Executive Overview"}
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
                    <div className="grid gap-4 xl:grid-cols-3">
                        {PLATFORMS.filter((p) => p.status === "live").map((p) => (
                            <PlatformStrip key={p.code} p={p} items={headlinesFor(p.code, all)} />
                        ))}
                    </div>
                    {connected > 0 && (
                        <Grid>
                            {(all.edu || all.hr) && <AttendancePanel edu={all.edu} hr={all.hr} />}
                            <Alerts {...all} />
                            {all.schools.length > 0 && <SchoolComparison all={all} />}
                            {PLATFORMS.filter((p) => p.status === "coming-soon").map((p) => (
                                <ComingSoon key={p.code} p={p} />
                            ))}
                        </Grid>
                    )}
                </div>
            )}
        </>
    )
}

function AttendancePanel({ edu, hr }: { edu: EduAnalysis | null; hr: HrAnalysis | null }) {
    const weeks = edu?.weeks ?? hr?.weeks ?? []
    const series = [
        ...(edu ? [{ key: "students", label: "Students", color: "var(--c1)", fill: true }] : []),
        ...(hr ? [{ key: "staff", label: "Staff", color: "var(--c2)", fill: true }] : []),
    ]
    return (
        <Panel
            span={8}
            title={edu && hr ? "Attendance: students vs staff" : edu ? "Student attendance" : "Staff attendance"}
            subtitle="Weekly attendance across the organisation"
            action={<Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
        >
            <TrendChart
                height={420}
                data={weeks.map((w, i) => ({ label: w.label, students: edu?.weeks[i]?.att ?? null, staff: hr?.weeks[i]?.att ?? null }))}
                series={series}
                yDomain={[(min: number) => Math.max(0, Math.floor(Math.min(min, 90) - 2)), 100]}
                yFormat={(v) => `${v}%`}
                valueFormat={(v) => pct(v)}
                target={{ value: 95, label: "Target 95%" }}
                titlePrefix="Week of "
            />
        </Panel>
    )
}

type SchoolRow = { s: (typeof SCHOOLS)[number]; e: EduAnalysis | null; h: HrAnalysis | null; fn: FinAnalysis | null }

function SchoolComparison({ all }: { all: Analyses & { schools: SchoolRow[] } }) {
    const columns: { header: string; cell: (r: SchoolRow) => ReactNode }[] = [
        ...(all.edu
            ? [
                  { header: "Students", cell: (r: SchoolRow) => fmt(r.e!.n) },
                  {
                      header: "Student attendance",
                      cell: (r: SchoolRow) => <Pill tone={r.e!.attTone}>{pct(r.e!.att)}</Pill>,
                  },
                  {
                      header: "Students at risk",
                      cell: (r: SchoolRow) => (
                          <span className="tabular text-ink-2">
                              {fmt(r.e!.totals.atRisk)}{" "}
                              <span className="text-muted">({pct(r.e!.n ? (r.e!.totals.atRisk / r.e!.n) * 100 : 0, 0)})</span>
                          </span>
                      ),
                  },
                  {
                      header: "Net behaviour / student",
                      cell: (r: SchoolRow) => {
                          const net = r.e!.n ? (r.e!.totals.ACH - r.e!.totals.INC) / r.e!.n : 0
                          return (
                              <span className={cn("tabular font-semibold", net >= 0 ? "text-good-ink" : "text-bad-ink")}>
                                  {net >= 0 ? "+" : "−"}
                                  {Math.abs(net).toFixed(1)}
                              </span>
                          )
                      },
                  },
              ]
            : []),
        ...(all.hr
            ? [
                  { header: "Staff", cell: (r: SchoolRow) => fmt(r.h!.n) },
                  { header: "Staff attendance", cell: (r: SchoolRow) => <Pill tone={statusOf(r.h!.att)}>{pct(r.h!.att)}</Pill> },
                  {
                      header: "Avg appraisal",
                      cell: (r: SchoolRow) => <b className="tabular text-ink font-semibold">{score(r.h!.avgAppraisal)}</b>,
                  },
                  ...(all.edu
                      ? [
                            {
                                header: "Students / teacher",
                                cell: (r: SchoolRow) => (
                                    <span className="tabular text-ink-2">{r.h!.teaching ? (r.e!.n / r.h!.teaching).toFixed(1) : "–"}</span>
                                ),
                            },
                        ]
                      : []),
              ]
            : []),
        ...(all.fin
            ? [
                  {
                      header: "Fee collection",
                      cell: (r: SchoolRow) => <Pill tone={collectionTone(r.fn!.fees.rate)}>{pct(r.fn!.fees.rate)}</Pill>,
                  },
                  {
                      header: "Outstanding",
                      cell: (r: SchoolRow) => <span className="tabular text-ink-2">{qar(r.fn!.fees.outstanding)}</span>,
                  },
                  {
                      header: "Budget variance",
                      cell: (r: SchoolRow) => <Pill tone={varianceTone(r.fn!.budget.varPct)}>{signedPct(r.fn!.budget.varPct)}</Pill>,
                  },
              ]
            : []),
    ]
    const parts = [all.edu && "students", all.hr && "staff", all.fin && "finances"].filter(Boolean)

    return (
        <Panel
            span={12}
            title="School comparison"
            subtitle={`${parts.join(", ").replace(/, ([^,]*)$/, " and $1")} side by side for each school`}
        >
            <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full border-separate border-spacing-y-1 text-[13px]" style={{ minWidth: 210 + columns.length * 110 }}>
                    <thead>
                        <tr className="text-muted text-[10.5px] font-bold tracking-[.12em] uppercase">
                            <th className="min-w-[210px] px-3 pb-1.5 text-left">School</th>
                            {columns.map((c) => (
                                <th key={c.header} className="px-3 pb-1.5 text-right">
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {all.schools.map((r) => (
                            <tr key={r.s.id} className="group">
                                <td className="bg-surface-2 group-hover:bg-primary-softer rounded-l-xl px-3 py-3 transition-colors">
                                    <b className="text-ink block font-semibold">{r.s.name}</b>
                                    <span className="text-muted text-[11.5px]">{r.s.intake}</span>
                                </td>
                                {columns.map((c, i) => (
                                    <td
                                        key={c.header}
                                        className={cn(
                                            "tabular bg-surface-2 text-ink-2 group-hover:bg-primary-softer px-3 py-3 text-right transition-colors",
                                            i === columns.length - 1 && "rounded-r-xl",
                                        )}
                                    >
                                        {c.cell(r)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    )
}

function PlatformStrip({ p, items }: { p: PlatformDefinition; items: Headline[] | null }) {
    const Icon = p.icon
    return (
        <section className="animate-rise border-line bg-surface shadow-card flex flex-col rounded-2xl border p-5">
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
                {items && (
                    <Link
                        href={p.basePath}
                        className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[rgba(47,91,216,.12)]"
                    >
                        Open <ArrowUpRight className="size-3.5" />
                    </Link>
                )}
            </header>
            {items ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
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
            ) : (
                <div className="border-line-strong flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
                    <p className="text-muted text-[12.5px]">No {p.name} data connected yet.</p>
                    <Link href="/admin/connections" className={buttonClass("soft", "sm")}>
                        <Cable className="size-3.5" /> Connections
                    </Link>
                </div>
            )}
        </section>
    )
}

function Alerts({ edu, hr, fin }: Analyses) {
    const groups = [
        edu && {
            label: "Students",
            more: "/edu/students",
            items: edu.list
                .filter((s) => s.m.status === "bad")
                .sort((a, b) => a.m.att - b.m.att)
                .slice(0, 3)
                .map((s) => ({
                    id: `edu:${s.id}`,
                    name: s.name,
                    meta: `Student · ${secName(s.yg, s.sec)} · ${schoolOf(s.school).short}`,
                    value: pct(s.m.att),
                    reason: s.m.tot && s.m.att < 90 ? "Persistent absence" : "Behaviour concern",
                    href: `/edu/students/${encodeURIComponent(s.id)}`,
                })),
        },
        hr && {
            label: "Staff",
            more: "/hr/staff",
            items: hr.list
                .filter((e) => e.m.status === "bad")
                .sort((a, b) => a.m.att - b.m.att)
                .slice(0, 3)
                .map((e) => ({
                    id: `hr:${e.id}`,
                    name: e.name,
                    meta: `${e.role} · ${locationOf(e.location).short}`,
                    value: pct(e.m.att),
                    reason: e.m.att < 90 ? "Low attendance" : "Low appraisal",
                    href: `/hr/staff/${encodeURIComponent(e.id)}`,
                })),
        },
        fin && {
            label: "Fee accounts",
            more: "/fin/accounts",
            items: fin.list
                .filter((a) => a.m.status === "arrears")
                .sort((a, b) => b.m.overdue - a.m.overdue)
                .slice(0, 3)
                .map((a) => ({
                    id: `fin:${a.id}`,
                    name: a.name,
                    meta: `Fee account · ${secName(a.yg, a.sec)} · ${schoolOf(a.school).short}`,
                    value: money(a.m.overdue),
                    reason:
                        a.m.daysOverdue > 90
                            ? "90+ days overdue"
                            : a.m.prior >= 1
                              ? "Prior term unpaid"
                              : `${a.m.daysOverdue} days overdue`,
                    href: `/fin/accounts/${encodeURIComponent(a.id)}`,
                })),
        },
    ].filter((g) => !!g)
    const flagged = [
        edu && `${fmt(edu.totals.atRisk)} students`,
        hr && `${fmt(hr.atRisk)} staff`,
        fin && `${fmt(fin.fees.arrears)} fee accounts`,
    ].filter(Boolean)

    return (
        <Panel span={edu || hr ? 4 : 12} title="Alerts" subtitle={`${flagged.join(", ").replace(/, ([^,]*)$/, " and $1")} flagged`}>
            <div className="space-y-4">
                {groups.map((g) => (
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
