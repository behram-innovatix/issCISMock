"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import { cn } from "@/lib/cn"
import { Check, KeyRound, Save } from "lucide-react"
import { useState } from "react"
import { ApiError, useSaveDataSource, type Catalog, type ConfigField, type Connector, type DataSource } from "./api"
import { ConnectorIcon, platformLabel, SCHEDULES } from "./shared"

type Config = Record<string, unknown>

const applies = (field: ConfigField, config: Config) =>
    !field.when || Object.entries(field.when).every(([k, v]) => (Array.isArray(v) ? v : [v]).includes(config[k] as string))

const initial = (f: ConfigField, saved: unknown) => {
    if (saved !== undefined && saved !== null) return saved
    if (f.type === "secret") return ""
    if (f.default !== null && f.default !== undefined) return f.default
    return f.type === "list" ? [] : f.type === "map" ? {} : f.type === "boolean" ? false : ""
}

/**
 * Settings for one data source. The "Connection" section is generated from the connector's own
 * field definitions, so new connector types get a form without UI changes.
 */
export function SourceForm({
    connector,
    catalog,
    source,
    onSaved,
    onCancel,
}: {
    connector: Connector
    catalog: Catalog
    source?: DataSource
    onSaved: (source: DataSource) => void
    onCancel?: () => void
}) {
    const platforms = connector.platforms ?? catalog.platforms.map((p) => p.code)
    const [name, setName] = useState(source?.name ?? "")
    const [platform, setPlatform] = useState(source?.platform ?? platforms[0])
    const [tenant, setTenant] = useState(source?.tenant ?? "default")
    const [schedule, setSchedule] = useState(source?.schedule ?? catalog.default_schedule)
    const [customSchedule, setCustomSchedule] = useState(!SCHEDULES.some((s) => s.value === (source?.schedule ?? catalog.default_schedule)))
    const [active, setActive] = useState(source?.is_active ?? true)
    const [config, setConfig] = useState<Config>(() =>
        Object.fromEntries(connector.fields.map((f) => [f.key, initial(f, source?.config[f.key])])),
    )
    const save = useSaveDataSource(source?.id)
    const errors = save.error instanceof ApiError ? save.error.errors : {}
    const streams = catalog.platforms.find((p) => p.code === platform)?.streams ?? []

    const set = (key: string, value: unknown) => setConfig((c) => ({ ...c, [key]: value }))

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const visible = Object.fromEntries(connector.fields.filter((f) => applies(f, config)).map((f) => [f.key, config[f.key]]))
        save.mutate(
            {
                name: name.trim(),
                type: source ? undefined : connector.type,
                platform,
                tenant: tenant.trim(),
                schedule: schedule.trim(),
                is_active: active,
                config: visible,
            },
            { onSuccess: onSaved },
        )
    }

    return (
        <form onSubmit={submit} noValidate>
            <Grid>
                <div className="col-span-12 space-y-4 xl:col-span-8">
                    <Panel title="General" subtitle="What this source feeds and how often it is pulled.">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field error={errors.name}>
                                <Input
                                    label="Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. issEduApi · Al Jazeera"
                                    autoFocus={!source}
                                />
                            </Field>
                            <Field error={errors.tenant} help="School, company or tenant code. Keeps IDs from different tenants apart.">
                                <Input label="Tenant" value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="default" />
                            </Field>
                            <Field label="Platform" error={errors.platform} help="Which CIS dashboards this data feeds.">
                                <Segmented
                                    label="Platform"
                                    value={platform}
                                    onChange={(p) => {
                                        setPlatform(p)
                                        const chosen = (config.streams as string[] | undefined) ?? []
                                        const next = catalog.platforms.find((x) => x.code === p)?.streams ?? []
                                        if (chosen.length)
                                            set(
                                                "streams",
                                                chosen.filter((s) => next.includes(s)),
                                            )
                                    }}
                                    options={platforms.map((p) => ({ value: p, label: platformLabel(p) }))}
                                />
                            </Field>
                            <Field label="Status" help={active ? "Synced on its schedule." : "Paused: kept, but not synced automatically."}>
                                <Segmented
                                    label="Status"
                                    value={active ? "on" : "off"}
                                    onChange={(v) => setActive(v === "on")}
                                    options={[
                                        { value: "on", label: "Active" },
                                        { value: "off", label: "Paused" },
                                    ]}
                                />
                            </Field>
                            <Field label="Schedule" error={errors.schedule} className="md:col-span-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Segmented
                                        label="Schedule"
                                        value={customSchedule ? "custom" : schedule}
                                        onChange={(v) => {
                                            setCustomSchedule(v === "custom")
                                            if (v !== "custom") setSchedule(v)
                                        }}
                                        options={[...SCHEDULES, { value: "custom", label: "Custom" }]}
                                    />
                                    {customSchedule && (
                                        <input
                                            aria-label="Cron expression"
                                            value={schedule}
                                            onChange={(e) => setSchedule(e.target.value)}
                                            placeholder="*/30 * * * *"
                                            className="border-line bg-surface focus:border-primary/40 focus:ring-primary/10 tabular h-9 w-44 rounded-xl border px-3 text-[13px] outline-none focus:ring-4"
                                        />
                                    )}
                                </div>
                                <Note className="mt-1.5">
                                    Changes are pulled on this schedule; every source is also fully reconciled overnight at 02:00.
                                </Note>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Connection" subtitle={`Settings for ${connector.label}.`}>
                        <div className="grid gap-4 md:grid-cols-2">
                            {connector.fields
                                .filter((f) => applies(f, config))
                                .map((f) => (
                                    <ConfigInput
                                        key={f.key}
                                        field={f}
                                        value={config[f.key]}
                                        onChange={(v) => set(f.key, v)}
                                        errors={errors}
                                        saved={source?.secrets.includes(f.key) ?? false}
                                        streams={streams}
                                    />
                                ))}
                        </div>
                    </Panel>
                </div>

                <div className="col-span-12 space-y-4 xl:col-span-4">
                    <Panel>
                        <div className="flex items-start gap-3">
                            <ConnectorIcon icon={connector.icon} size="lg" />
                            <div className="min-w-0">
                                <div className="text-ink text-[14.5px] font-semibold">{connector.label}</div>
                                <Pill className="mt-1">{connector.category}</Pill>
                            </div>
                        </div>
                        <p className="text-ink-2 mt-3 text-[12.5px] leading-relaxed">{connector.description}</p>
                        <div className="eyebrow mt-5 mb-2">How it syncs</div>
                        <ul className="space-y-1.5">
                            {[
                                "Records are pulled into the CIS raw store, never queried live by dashboards.",
                                "Each run is checked: a sudden drop in records blocks the update and keeps the last good data.",
                                "Secrets are stored encrypted and are never shown again.",
                            ].map((x) => (
                                <li key={x} className="text-ink-2 flex gap-2 text-[12.5px]">
                                    <Check className="text-good mt-0.5 size-4 shrink-0" />
                                    {x}
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </Grid>

            <div className="border-line bg-bg/80 sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
                {save.error && !Object.keys(errors).length && (
                    <p className="bg-bad-soft text-bad-ink mr-auto rounded-xl px-3 py-2 text-[12px] font-semibold">{save.error.message}</p>
                )}
                {Object.keys(errors).length > 0 && (
                    <p className="text-bad-ink mr-auto text-[12px] font-semibold">Check the highlighted settings.</p>
                )}
                {onCancel && <Button onClick={onCancel}>Cancel</Button>}
                <Button type="submit" variant="primary" disabled={save.isPending}>
                    <Save className="size-4" /> {save.isPending ? "Saving…" : "Save & test"}
                </Button>
            </div>
        </form>
    )
}

function Field({
    label,
    help,
    error,
    className,
    children,
}: {
    label?: string
    help?: string | null
    error?: string[]
    className?: string
    children: React.ReactNode
}) {
    return (
        <div className={className}>
            {label && <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">{label}</div>}
            {children}
            {error ? (
                <p className="text-bad-ink mt-1.5 text-[11.5px] font-semibold">{error[0]}</p>
            ) : (
                help && <p className="text-muted mt-1.5 text-[11.5px] leading-snug">{help}</p>
            )}
        </div>
    )
}

function ConfigInput({
    field: f,
    value,
    onChange,
    errors,
    saved,
    streams,
}: {
    field: ConfigField
    value: unknown
    onChange: (v: unknown) => void
    errors: Record<string, string[]>
    saved: boolean
    streams: string[]
}) {
    const error = errors[`config.${f.key}`]
    const label = f.required ? f.label : `${f.label} (optional)`

    if (f.type === "boolean") {
        return (
            <Field label={f.label} help={f.help} error={error}>
                <Segmented
                    label={f.label}
                    value={value ? "on" : "off"}
                    onChange={(v) => onChange(v === "on")}
                    options={[
                        { value: "on", label: "On" },
                        { value: "off", label: "Off" },
                    ]}
                />
            </Field>
        )
    }

    if (f.type === "textarea") {
        return (
            <Field label={label} help={f.help} error={error} className="md:col-span-2">
                <CodeArea
                    value={String(value ?? "")}
                    onChange={onChange}
                    placeholder={f.placeholder}
                    language={f.language}
                    rows={4}
                    label={f.label}
                />
            </Field>
        )
    }

    if (f.type === "map") {
        return (
            <MapEditor
                field={f}
                label={label}
                value={(value as Record<string, string>) ?? {}}
                onChange={onChange}
                errors={errors}
                streams={streams}
            />
        )
    }

    if (f.type === "select") {
        return (
            <Field label={f.label} help={f.help} error={error} className="md:col-span-2">
                <Segmented label={f.label} value={String(value ?? "")} onChange={onChange} options={f.options} />
            </Field>
        )
    }

    if (f.type === "list") {
        const list = Array.isArray(value) ? (value as string[]) : []
        // a list of streams offers the platform's streams as toggles; other lists are comma separated
        if (f.key === "streams") {
            return (
                <Field label={label} help={f.help} error={error} className="md:col-span-2">
                    <div className="flex flex-wrap gap-1.5">
                        {streams.map((s) => {
                            const on = list.includes(s)
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => onChange(on ? list.filter((x) => x !== s) : [...list, s])}
                                    className={cn(
                                        "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                                        on
                                            ? "border-primary/30 bg-primary-soft text-primary"
                                            : "border-line text-ink-2 hover:border-line-strong",
                                    )}
                                >
                                    {s.replaceAll("_", " ")}
                                </button>
                            )
                        })}
                    </div>
                    {list.length === 0 && <p className="text-muted mt-1.5 text-[11.5px]">All {streams.length} streams will be pulled.</p>}
                </Field>
            )
        }
        return (
            <Field help={f.help} error={error}>
                <Input
                    label={label}
                    value={list.join(", ")}
                    placeholder={f.placeholder ?? "Comma separated"}
                    onChange={(e) =>
                        onChange(
                            e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean),
                        )
                    }
                />
            </Field>
        )
    }

    if (f.type === "secret") {
        return <SecretInput field={f} label={label} value={String(value ?? "")} onChange={onChange} error={error} saved={saved} />
    }

    return (
        <Field help={f.help} error={error} className={f.type === "url" || f.type === "path" ? "md:col-span-2" : undefined}>
            <Input
                label={label}
                type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                inputMode={f.type === "number" ? "numeric" : undefined}
                value={value === null || value === undefined ? "" : String(value)}
                placeholder={f.placeholder ?? ""}
                onChange={(e) => onChange(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
            />
        </Field>
    )
}

/** Monospaced multi-line editor for SQL, JSON or plain text settings. */
function CodeArea({
    value,
    onChange,
    placeholder,
    language,
    rows,
    label,
}: {
    value: string
    onChange: (v: string) => void
    placeholder: string | null
    language: ConfigField["language"]
    rows: number
    label: string
}) {
    return (
        <div className="border-line bg-surface focus-within:border-primary/40 focus-within:ring-primary/10 overflow-hidden rounded-xl border transition-all focus-within:ring-4">
            {language && language !== "text" && (
                <div className="border-line bg-surface-2 text-muted border-b px-3 py-1 text-[10.5px] font-bold tracking-wide uppercase">
                    {language}
                </div>
            )}
            <textarea
                aria-label={label}
                value={value}
                rows={rows}
                spellCheck={false}
                placeholder={placeholder ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="placeholder:text-muted text-ink block w-full resize-y bg-transparent px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none"
            />
        </div>
    )
}

/** One value per stream of the platform (a query, an endpoint, a field mapping): streams on the left, the editor on the right. */
function MapEditor({
    field: f,
    label,
    value,
    onChange,
    errors,
    streams,
}: {
    field: ConfigField
    label: string
    value: Record<string, string>
    onChange: (v: Record<string, string>) => void
    errors: Record<string, string[]>
    streams: string[]
}) {
    const [selected, setSelected] = useState(() => streams.find((s) => value[s]) ?? streams[0])
    const current = streams.includes(selected) ? selected : streams[0]
    const configured = streams.filter((s) => (value[s] ?? "").trim() !== "").length
    const error = errors[`config.${f.key}`] ?? errors[`config.${f.key}.${current}`]

    return (
        <Field label={label} help={f.help} error={error} className="md:col-span-2">
            <div className="border-line grid overflow-hidden rounded-xl border md:grid-cols-[200px_1fr]">
                <ul
                    className="border-line bg-surface-2 max-h-[340px] overflow-y-auto border-b p-1.5 md:border-r md:border-b-0"
                    aria-label={`${f.label} by stream`}
                >
                    {streams.map((s) => {
                        const has = (value[s] ?? "").trim() !== ""
                        const bad = !!errors[`config.${f.key}.${s}`]
                        return (
                            <li key={s}>
                                <button
                                    type="button"
                                    onClick={() => setSelected(s)}
                                    aria-current={s === current}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold transition-colors",
                                        s === current
                                            ? "bg-surface text-primary shadow-[0_1px_3px_rgba(20,40,90,.12)]"
                                            : "text-ink-2 hover:text-ink",
                                    )}
                                >
                                    <i
                                        className="size-1.5 shrink-0 rounded-full"
                                        style={{ background: bad ? "var(--bad)" : has ? "var(--good)" : "var(--line-strong)" }}
                                    />
                                    <span className="truncate">{s.replaceAll("_", " ")}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
                <div className="min-w-0 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-ink text-[12.5px] font-semibold">{current.replaceAll("_", " ")}</span>
                        <span className="text-muted text-[11px]">
                            {configured} of {streams.length} streams set
                        </span>
                    </div>
                    <CodeArea
                        label={`${f.label}: ${current}`}
                        value={value[current] ?? ""}
                        onChange={(v) => onChange({ ...value, [current]: v })}
                        placeholder={f.placeholder}
                        language={f.language}
                        rows={f.language === "sql" ? 12 : 4}
                    />
                </div>
            </div>
        </Field>
    )
}

/** 48 random URL-safe characters, made in the browser so the admin sees the secret once. */
const randomSecret = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    return Array.from(crypto.getRandomValues(new Uint8Array(48)), (b) => alphabet[b % alphabet.length]).join("")
}

/**
 * Write-only secret. Saved values are never sent back; a generated secret (e.g. a signing secret
 * the sending system needs) is created here and shown until the form is saved, to copy it across.
 */
function SecretInput({
    field: f,
    label,
    value,
    onChange,
    error,
    saved,
}: {
    field: ConfigField
    label: string
    value: string
    onChange: (v: string) => void
    error?: string[]
    saved: boolean
}) {
    const [shown, setShown] = useState(false)
    const help = shown
        ? "Copy this secret to the sending system now: once saved it can’t be shown again."
        : saved
          ? "Saved. Leave empty to keep the current value."
          : f.help

    return (
        <Field help={help} error={error}>
            <Input
                label={label}
                type={shown ? "text" : "password"}
                autoComplete="new-password"
                icon={<KeyRound />}
                value={value}
                placeholder={saved ? "••••••••••••" : (f.placeholder ?? "")}
                onChange={(e) => {
                    setShown(false)
                    onChange(e.target.value)
                }}
                trailing={
                    f.generated ? (
                        <button
                            type="button"
                            onClick={() => {
                                onChange(randomSecret())
                                setShown(true)
                            }}
                            className="text-primary hover:bg-primary-soft shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-semibold"
                        >
                            {saved || value ? "New" : "Generate"}
                        </button>
                    ) : saved && !value ? (
                        <Pill tone="good">Saved</Pill>
                    ) : undefined
                }
            />
        </Field>
    )
}
