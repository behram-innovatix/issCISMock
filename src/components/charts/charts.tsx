"use client"

import { fmt } from "@/lib/format"
import { type ReactNode, useId, useSyncExternalStore } from "react"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from "recharts"

/* ---------- shared bits ---------- */

type DomainEnd = number | string | ((v: number) => number)

const AXIS = { stroke: "transparent", tickLine: false, tick: { fill: "var(--muted)", fontSize: 11 } } as const
const REDUCED = "(prefers-reduced-motion: reduce)"
const subscribeMotion = (cb: () => void) => {
    const mq = window.matchMedia(REDUCED)
    mq.addEventListener("change", cb)
    return () => mq.removeEventListener("change", cb)
}
/** Chart animation props; animation is switched off for users who prefer reduced motion. */
function useAnim() {
    const reduced = useSyncExternalStore(
        subscribeMotion,
        () => window.matchMedia(REDUCED).matches,
        () => false,
    )
    return { isAnimationActive: !reduced, animationDuration: 700, animationEasing: "ease-out" } as const
}

export interface TipRow {
    label: string
    value: string
    color?: string
}

export function ChartTipBox({ title, rows }: { title?: ReactNode; rows: TipRow[] }) {
    return (
        <div className="border-line bg-surface/95 shadow-pop min-w-36 rounded-xl border px-3 py-2 text-[12px] backdrop-blur">
            {title && <div className="text-ink mb-1 font-semibold">{title}</div>}
            {rows.map((r, i) => (
                <div key={i} className="text-ink-2 flex items-center gap-2 py-0.5">
                    {r.color && <i className="size-2 rounded-[3px]" style={{ background: r.color }} />}
                    <span className="flex-1">{r.label}</span>
                    <b className="tabular text-ink font-semibold">{r.value}</b>
                </div>
            ))}
        </div>
    )
}

interface TipPayload {
    name?: string | number
    value?: unknown
    color?: string
    dataKey?: unknown
    payload?: Record<string, unknown>
}
type TipFn = (label: string, payload: TipPayload[]) => { title?: ReactNode; rows: TipRow[] } | null

function makeTip(fn: TipFn) {
    function ChartTip(p: { active?: boolean; label?: unknown; payload?: readonly unknown[] }) {
        if (!p.active || !p.payload?.length) return null
        const r = fn(String(p.label ?? ""), p.payload as TipPayload[])
        return r ? <ChartTipBox {...r} /> : null
    }
    return ChartTip
}

const CURSOR = { fill: "rgba(47,91,216,.05)" }

/* ---------- line / area trend ---------- */

export interface Series {
    key: string
    label: string
    color: string
    dashed?: boolean
    fill?: boolean
}

export function TrendChart({
    data,
    xKey = "label",
    series,
    height = 260,
    yDomain,
    yFormat = (v: number) => String(v),
    valueFormat,
    target,
    extraRows,
    titlePrefix = "",
}: {
    data: Record<string, unknown>[]
    xKey?: string
    series: Series[]
    height?: number
    yDomain?: [DomainEnd, DomainEnd]
    yFormat?: (v: number) => string
    valueFormat?: (v: number) => string
    target?: { value: number; label: string }
    extraRows?: (row: Record<string, unknown>) => TipRow[]
    titlePrefix?: string
}) {
    const anim = useAnim()
    const gid = useId().replace(/:/g, "")
    const vf = valueFormat ?? yFormat
    const Tip = makeTip((label, payload) => ({
        title: titlePrefix + label,
        rows: [
            ...payload.map((p) => ({
                label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.name),
                value: vf(Number(p.value)),
                color: String(p.color),
            })),
            ...(extraRows && payload[0]?.payload ? extraRows(payload[0].payload) : []),
        ],
    }))
    const anyFill = series.some((s) => s.fill)
    const Chart = anyFill ? AreaChart : LineChart
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <Chart data={data} margin={{ top: 8, right: 18, bottom: 0, left: -12 }}>
                    <defs>
                        {series.map((s, i) => (
                            <linearGradient key={s.key} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey={xKey} {...AXIS} dy={6} interval={0} />
                    <YAxis {...AXIS} domain={yDomain} tickFormatter={yFormat} width={52} />
                    <Tooltip content={Tip} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
                    {target && (
                        <ReferenceLine
                            y={target.value}
                            stroke="var(--good)"
                            strokeDasharray="4 4"
                            strokeOpacity={0.6}
                            label={{ value: target.label, position: "insideTopRight", fill: "var(--good-ink)", fontSize: 10.5 }}
                        />
                    )}
                    {series.map((s, i) =>
                        anyFill ? (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                stroke={s.color}
                                strokeWidth={s.dashed ? 1.75 : 2.25}
                                strokeDasharray={s.dashed ? "5 5" : undefined}
                                fill={s.fill ? `url(#${gid}-g${i})` : "transparent"}
                                dot={s.dashed ? false : { r: 3, fill: "#fff", stroke: s.color, strokeWidth: 2 }}
                                activeDot={{ r: 5, strokeWidth: 0, fill: s.color }}
                                {...anim}
                            />
                        ) : (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                stroke={s.color}
                                strokeWidth={s.dashed ? 1.75 : 2.25}
                                strokeDasharray={s.dashed ? "5 5" : undefined}
                                dot={s.dashed ? false : { r: 3, fill: "#fff", stroke: s.color, strokeWidth: 2 }}
                                activeDot={{ r: 5, strokeWidth: 0, fill: s.color }}
                                {...anim}
                            />
                        ),
                    )}
                </Chart>
            </ResponsiveContainer>
        </div>
    )
}

/* ---------- donut ---------- */

export interface Slice {
    name: string
    v: number
    color: string
}

export function Donut({
    data,
    height = 210,
    center,
    format = (v: number, total: number) => `${fmt(v)} · ${total ? ((v / total) * 100).toFixed(1) : 0}%`,
}: {
    data: Slice[]
    height?: number
    center?: { value: ReactNode; label: ReactNode }
    format?: (v: number, total: number) => string
}) {
    const anim = useAnim()
    const total = data.reduce((s, d) => s + d.v, 0)
    const Tip = makeTip((_, payload) => ({
        rows: payload.map((p) => ({
            label: String(p.name),
            value: format(Number(p.value), total),
            color: String((p.payload as { color?: string })?.color),
        })),
    }))
    return (
        <div className="relative" style={{ height }}>
            <ResponsiveContainer>
                <PieChart>
                    <Tooltip content={Tip} />
                    <Pie
                        data={data}
                        dataKey="v"
                        nameKey="name"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius="68%"
                        outerRadius="94%"
                        paddingAngle={data.filter((d) => d.v > 0).length > 1 ? 2 : 0}
                        cornerRadius={5}
                        stroke="none"
                        {...anim}
                    >
                        {data.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            {center && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <b className="tabular font-display text-ink text-[22px] leading-none font-semibold">{center.value}</b>
                    <span className="text-muted mt-1 text-[11px]">{center.label}</span>
                </div>
            )}
        </div>
    )
}

/* ---------- bars ---------- */

export function BarsChart({
    data,
    xKey = "label",
    series,
    height = 260,
    stacked,
    horizontal,
    yFormat = (v: number) => fmt(v),
    valueFormat,
    yDomain,
    colorOf,
    onBarClick,
    target,
    categoryWidth = 120,
    titlePrefix = "",
    signedAbs,
}: {
    data: Record<string, unknown>[]
    xKey?: string
    series: Series[]
    height?: number
    stacked?: boolean
    horizontal?: boolean
    yFormat?: (v: number) => string
    valueFormat?: (v: number) => string
    yDomain?: [DomainEnd, DomainEnd]
    /** per-row colour override for single-series bars */
    colorOf?: (row: Record<string, unknown>) => string
    onBarClick?: (row: Record<string, unknown>) => void
    target?: { value: number; label: string }
    categoryWidth?: number
    titlePrefix?: string
    /** show absolute values in tooltips/axes (diverging charts) */
    signedAbs?: boolean
}) {
    const anim = useAnim()
    const vf = valueFormat ?? yFormat
    const Tip = makeTip((label, payload) => ({
        title: titlePrefix + label,
        rows: payload.map((p) => ({
            label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.name),
            value: vf(signedAbs ? Math.abs(Number(p.value)) : Number(p.value)),
            color: colorOf && p.payload ? colorOf(p.payload) : String(p.color),
        })),
    }))
    const valueAxis = {
        ...AXIS,
        type: "number" as const,
        domain: yDomain,
        tickCount: 6,
        tickFormatter: (v: number) => yFormat(signedAbs ? Math.abs(v) : v),
    }
    const catAxis = { ...AXIS, type: "category" as const, dataKey: xKey }
    const radius = (i: number): [number, number, number, number] => {
        const last = i === series.length - 1
        if (stacked && !last && !signedAbs) return [0, 0, 0, 0]
        return horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]
    }
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <BarChart
                    data={data}
                    layout={horizontal ? "vertical" : "horizontal"}
                    margin={{ top: 8, right: 10, bottom: 0, left: horizontal ? 0 : -12 }}
                    barCategoryGap={horizontal ? "22%" : "26%"}
                    stackOffset={signedAbs ? "sign" : undefined}
                >
                    <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} />
                    {horizontal ? (
                        <>
                            <XAxis {...valueAxis} />
                            <YAxis
                                {...catAxis}
                                interval={0}
                                width={categoryWidth}
                                tick={{ fill: "var(--ink-2)", fontSize: 11.5, fontWeight: 600 }}
                            />
                        </>
                    ) : (
                        <>
                            <XAxis {...catAxis} dy={6} interval={0} />
                            <YAxis {...valueAxis} width={52} />
                        </>
                    )}
                    <Tooltip content={Tip} cursor={CURSOR} />
                    {signedAbs &&
                        (horizontal ? (
                            <ReferenceLine x={0} stroke="var(--line-strong)" />
                        ) : (
                            <ReferenceLine y={0} stroke="var(--line-strong)" />
                        ))}
                    {target &&
                        (horizontal ? (
                            <ReferenceLine x={target.value} stroke="var(--good)" strokeDasharray="4 4" />
                        ) : (
                            <ReferenceLine y={target.value} stroke="var(--good)" strokeDasharray="4 4" />
                        ))}
                    {series.map((s, i) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            fill={s.color}
                            stackId={stacked ? "a" : undefined}
                            radius={radius(i)}
                            maxBarSize={horizontal ? 18 : 38}
                            cursor={onBarClick ? "pointer" : undefined}
                            onClick={onBarClick ? (d) => onBarClick((d as { payload: Record<string, unknown> }).payload) : undefined}
                            {...anim}
                        >
                            {colorOf && data.map((row, j) => <Cell key={j} fill={colorOf(row)} />)}
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

/* ---------- scatter ---------- */

export function ScatterPlot({
    data,
    xKey,
    yKey,
    xLabel,
    yLabel,
    xDomain,
    yDomain,
    xFormat = (v: number) => String(v),
    yFormat = (v: number) => String(v),
    colorOf,
    height = 300,
    tipTitle,
    onPointClick,
    refX,
    refY,
}: {
    data: Record<string, unknown>[]
    xKey: string
    yKey: string
    xLabel: string
    yLabel: string
    xDomain?: [DomainEnd, DomainEnd]
    yDomain?: [DomainEnd, DomainEnd]
    xFormat?: (v: number) => string
    yFormat?: (v: number) => string
    colorOf: (row: Record<string, unknown>) => string
    height?: number
    tipTitle: (row: Record<string, unknown>) => ReactNode
    onPointClick?: (row: Record<string, unknown>) => void
    refX?: number
    refY?: number
}) {
    const anim = useAnim()
    const Tip = makeTip((_, payload) => {
        const row = payload[0]?.payload
        if (!row) return null
        return {
            title: tipTitle(row),
            rows: [
                { label: xLabel, value: xFormat(Number(row[xKey])) },
                { label: yLabel, value: yFormat(Number(row[yKey])) },
            ],
        }
    })
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 12, bottom: 14, left: -6 }}>
                    <CartesianGrid />
                    <XAxis
                        {...AXIS}
                        type="number"
                        dataKey={xKey}
                        name={xLabel}
                        domain={xDomain}
                        tickFormatter={xFormat}
                        label={{ value: xLabel, position: "insideBottom", offset: -8, fill: "var(--muted)", fontSize: 11 }}
                    />
                    <YAxis
                        {...AXIS}
                        type="number"
                        dataKey={yKey}
                        name={yLabel}
                        domain={yDomain}
                        tickFormatter={yFormat}
                        width={56}
                        label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 16, fill: "var(--muted)", fontSize: 11 }}
                    />
                    <ZAxis range={[46, 46]} />
                    {refX != null && <ReferenceLine x={refX} stroke="var(--line-strong)" strokeDasharray="4 4" />}
                    {refY != null && <ReferenceLine y={refY} stroke="var(--line-strong)" strokeDasharray="4 4" />}
                    <Tooltip content={Tip} cursor={{ strokeDasharray: "3 3", stroke: "var(--line-strong)" }} />
                    <Scatter
                        data={data}
                        cursor={onPointClick ? "pointer" : undefined}
                        onClick={onPointClick ? (d) => onPointClick((d as { payload: Record<string, unknown> }).payload) : undefined}
                        {...anim}
                    >
                        {data.map((row, i) => (
                            <Cell key={i} fill={colorOf(row)} fillOpacity={0.72} stroke="#fff" strokeWidth={1} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}

/* ---------- radar ---------- */

/** Wraps long competency names onto two lines so they never clip at the panel edge. */
function RadarTick(props: {
    x?: number | string
    y?: number | string
    cy?: number | string
    payload?: { value?: string }
    textAnchor?: string
}) {
    const x = Number(props.x)
    const y = Number(props.y)
    const words = String(props.payload?.value ?? "").split(" ")
    const lines =
        words.length > 1
            ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
            : words
    const dy = y < Number(props.cy ?? y) ? -(lines.length - 1) * 12 : 0
    return (
        <text
            x={x}
            y={y + dy}
            textAnchor={(props.textAnchor as "start" | "middle" | "end") ?? "middle"}
            fill="var(--ink-2)"
            fontSize={11}
            fontWeight={600}
        >
            {lines.map((l, i) => (
                <tspan key={i} x={x} dy={i ? 12 : 0}>
                    {l}
                </tspan>
            ))}
        </text>
    )
}

export function RadarPlot({
    data,
    series,
    height = 280,
    domain = [1, 5],
    format = (v: number) => v.toFixed(2),
}: {
    data: Record<string, unknown>[]
    series: Series[]
    height?: number
    domain?: [number, number]
    format?: (v: number) => string
}) {
    const anim = useAnim()
    const Tip = makeTip((label, payload) => ({
        title: label,
        rows: payload.map((p) => ({
            label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.name),
            value: format(Number(p.value)),
            color: String(p.color),
        })),
    }))
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <RadarChart data={data} outerRadius="66%" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <PolarGrid stroke="var(--line-strong)" />
                    <PolarAngleAxis dataKey="name" tick={RadarTick} />
                    <PolarRadiusAxis domain={domain} tick={false} axisLine={false} tickCount={5} />
                    <Tooltip content={Tip} />
                    {series.map((s) => (
                        <Radar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.color}
                            strokeWidth={2}
                            strokeDasharray={s.dashed ? "5 5" : undefined}
                            fill={s.color}
                            fillOpacity={s.fill ? 0.16 : 0}
                            dot={{ r: 3, fill: "#fff", stroke: s.color, strokeWidth: 2 }}
                            {...anim}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}

/* ---------- sparkline ---------- */

export function Sparkline({ data, color = "var(--primary)", height = 44 }: { data: number[]; color?: string; height?: number }) {
    const gid = useId().replace(/:/g, "")
    const rows = data.map((v, i) => ({ i, v }))
    return (
        <div style={{ height }}>
            <ResponsiveContainer>
                <AreaChart data={rows} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#${gid})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
