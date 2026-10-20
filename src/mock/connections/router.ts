import {
    ApiError,
    type Connector,
    type DataSource,
    type SourceTableRow,
    type StreamModel,
    type StreamModelInput,
    type SyncMode,
    type SyncRun,
    type TableDetail,
    type TableSelection,
    type UploadedFile,
} from "@/features/connections/api"
import { CATALOG, connectorOf, PLATFORM_CODES, streamFields, streamsOf } from "./catalog"
import {
    type MockModel,
    type MockRun,
    type MockSelection,
    type MockSource,
    type MockState,
    placeholders,
    queryColumns,
    replicationStats,
    runStats,
    SOURCE_DB,
} from "./seed"
import { load, save } from "./store"

// The CIS API's admin routes (issCisApi Api\*Controller), answered in the browser for the preview.
// Paths are the ones app/api/admin/connections forwards; results are the responses' `data`.

const LATENCY = 150
const PREVIEW_ROWS = 20
const UPLOAD_EXTENSIONS = ["csv", "txt", "xlsx", "xls"]

const iso = (ms = Date.now()) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z")
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const notFound = (message = "Not found."): never => {
    throw new ApiError(message, 404)
}

/** A 422 the way Laravel words it: the first message, plus how many more there are. */
function invalid(errors: Record<string, string[]>): never {
    const all = Object.values(errors).flat()
    const more = all.length - 1
    throw new ApiError(more ? `${all[0]} (and ${plural(more, "more error")})` : all[0], 422, errors)
}

const blank = (v: unknown) =>
    v === undefined ||
    v === null ||
    (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)

/* ---------- settings ---------- */

const applies = (when: Record<string, string | string[]> | null, config: Record<string, unknown>) =>
    !when || Object.entries(when).every(([k, values]) => ([] as string[]).concat(values).includes(config[k] as string))

function configErrors(connector: Connector, config: Record<string, unknown>) {
    const errors: Record<string, string[]> = {}
    for (const f of connector.fields) {
        const key = `config.${f.key}`
        const v = config[f.key]
        if (blank(v)) {
            if (f.required && !f.generated && applies(f.when, config)) errors[key] = [`The ${f.label} field is required.`]
            continue
        }
        if (f.type === "url" && !(typeof v === "string" && /^https?:\/\/[^\s/$.?#].\S*$/i.test(v)))
            errors[key] = [`The ${f.label} field must be a valid URL.`]
        if (f.type === "number" && !(Number.isInteger(Number(v)) && Number(v) >= 0))
            errors[key] = [`The ${f.label} field must be a whole number.`]
        if (f.type === "select" && !f.options.some((o) => o.value === v)) errors[key] = [`The selected ${f.label} is invalid.`]
    }
    return errors
}

/** The saved form of the settings: only the fields in use, defaults filled in, empty values dropped. */
function normalise(connector: Connector, config: Record<string, unknown>) {
    const out: Record<string, unknown> = {}
    for (const f of connector.fields) {
        if (!applies(f.when, config)) continue
        let v = config[f.key] ?? f.default
        if (f.type === "map")
            v = Object.fromEntries(
                Object.entries((v ?? {}) as Record<string, unknown>).filter(([, x]) => typeof x === "string" && x.trim() !== ""),
            )
        else if (f.type === "boolean") v = !!v
        else if (f.type === "number" && !blank(v)) v = Number(v)
        else if (f.generated && blank(v)) v = "generated"
        if (!blank(v)) out[f.key] = v
    }
    return out
}

const withSecrets = (s: MockSource) => ({ ...s.config, ...Object.fromEntries(s.secrets.map((k) => [k, "•"])) })

const settingsComplete = (s: MockSource) => {
    const connector = connectorOf(s.type)
    return !!connector && Object.keys(configErrors(connector, withSecrets(s))).length === 0
}

const CRON_PART = /^(\*|\d+(-\d+)?)(\/\d+)?(,(\*|\d+(-\d+)?)(\/\d+)?)*$/
const validCron = (v: unknown) =>
    typeof v === "string" &&
    v.trim().split(/\s+/).length === 5 &&
    v
        .trim()
        .split(/\s+/)
        .every((p) => CRON_PART.test(p))

/* ---------- resources ---------- */

/** A run that hasn’t reached its finishing time yet is still running. */
function runResource(run: MockRun, now = Date.now()): SyncRun {
    const base = { id: run.id, mode: run.mode, error: run.error, started_at: run.started_at }
    if (run.finished_at && Date.parse(run.finished_at) > now)
        return { ...base, status: "running", stats: {}, replication: null, finished_at: null, duration_seconds: null }
    return {
        ...base,
        status: run.status,
        stats: run.stats,
        replication: run.replication,
        finished_at: run.finished_at,
        duration_seconds: run.finished_at ? Math.round((Date.parse(run.finished_at) - Date.parse(run.started_at)) / 1000) : null,
    }
}

const runsOf = (state: MockState, id: number) => state.runs.filter((r) => r.source_id === id).sort((a, b) => b.id - a.id)

function sourceResource(state: MockState, s: MockSource): DataSource {
    const connector = connectorOf(s.type)
    const features = connector?.features ?? []
    const complete = settingsComplete(s)
    const models = state.models.filter((m) => m.source_id === s.id)
    const latest = runsOf(state, s.id)[0]
    return {
        id: s.id,
        name: s.name,
        type: s.type,
        connector: connector
            ? { label: connector.label, category: connector.category, icon: connector.icon, features }
            : { label: s.type, category: "Unknown", icon: "plug", features: [] },
        settings_complete: complete,
        needs_setup: !complete || (features.includes("tables") && models.length === 0),
        tables: features.includes("tables")
            ? { copied: state.selections.filter((t) => t.source_id === s.id).length, streams: models.length }
            : null,
        ingest_url: features.includes("ingest") ? `https://cis-api.example.com/api/v1/ingest/${s.id}/{stream}` : null,
        platform: s.platform,
        tenant: s.tenant,
        schedule: s.schedule,
        is_active: s.is_active,
        status: s.status,
        last_synced_at: s.last_synced_at,
        last_error: s.last_error,
        config: s.config,
        secrets: s.secrets,
        latest_run: latest ? runResource(latest) : null,
        created_at: s.created_at,
    }
}

const replicaName = (sourceId: number, name: string) =>
    `s${sourceId}_${name
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")}`

const dbTable = (name: string) => SOURCE_DB.find((t) => t.name.toLowerCase() === name.toLowerCase())

const replicable = (name: string) => (dbTable(name)?.columns ?? []).filter((c) => c.replicable).map((c) => c.name)

function usedBy(state: MockState, t: MockSelection) {
    return state.models
        .filter(
            (m) =>
                m.source_id === t.source_id &&
                (m.kind === "table"
                    ? m.source_table_id === t.id
                    : placeholders(m.sql ?? "").some((p) => p.toLowerCase() === t.name.toLowerCase())),
        )
        .map((m) => m.stream)
}

function selectionResource(state: MockState, t: MockSelection | undefined): TableSelection | null {
    if (!t) return null
    return {
        id: t.id,
        qualified: t.name,
        columns: t.columns,
        copied_columns: t.columns ?? replicable(t.name),
        primary_key: t.primary_key,
        cursor_column: t.cursor_column,
        filter: t.filter,
        replica_table: replicaName(t.source_id, t.name),
        rows: t.rows,
        last_synced_at: t.last_synced_at,
        last_error: t.last_error,
        used_by: usedBy(state, t),
    }
}

const modelResource = (m: MockModel | undefined): StreamModel | null =>
    m
        ? {
              kind: m.kind,
              source_table_id: m.source_table_id ?? null,
              column_map: m.column_map,
              filter: m.filter ?? null,
              sql: m.sql ?? null,
              output_columns: m.output_columns,
              updated_at: m.updated_at,
          }
        : null

/* ---------- sample rows for previews ---------- */

const FIRST = ["Omar", "Mariam", "Yusuf", "Layla", "Adam", "Noor", "Khalid", "Sara", "Liam", "Aisha", "Hamad", "Hana"]
const LAST = ["Al-Mansouri", "Haddad", "Rahman", "Khan", "Saleh", "Nasser", "Farouk", "Bennett", "Carter", "Hussein"]

function guid(i: number, salt: string) {
    let h = 2166136261
    for (const ch of `${salt}:${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0")
    return `${hex(h)}-${hex(h * 31).slice(0, 4)}-4${hex(h * 17).slice(0, 3)}-a${hex(h * 7).slice(0, 3)}-${hex(h * 13)}${hex(h * 3).slice(0, 4)}`
}

function sample(col: string, i: number): unknown {
    const c = col.toLowerCase()
    const pick = <T>(a: T[]) => a[i % a.length]
    const day = `2026-${String(9 + (i % 2)).padStart(2, "0")}-${String(1 + ((i * 3) % 28)).padStart(2, "0")}`
    if (c === "uid" || c.endsWith("_uid") || c === "recorded_by" || c === "created_by" || c.endsWith("_id") || c === "section_key")
        return guid(i, c)
    if (c === "id") return guid(i, "id")
    if (c === "first_name") return pick(FIRST)
    if (c === "last_name") return LAST[(i * 7) % LAST.length]
    if (c === "name") return `${pick(FIRST)} ${LAST[(i * 7) % LAST.length]}`
    if (c.endsWith("_at") || c === "datetime")
        return `${day} ${String(7 + (i % 8)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}:00`
    if (c === "date" || c.endsWith("_date") || c === "issued" || c === "from") return day
    if (c.startsWith("is_") || c === "teaching" || c === "transport") return i % 5 === 0 ? 0 : 1
    if (c === "school" || c === "school_code") return pick(["AJA", "AMAB", "AMAG"])
    if (c === "school_name") return pick(["Al Jazeera Academy", "Al Maha Academy for Boys", "Al Maha Academy for Girls"])
    if (c === "short_name") return pick(["Al Jazeera", "Al Maha Boys", "Al Maha Girls"])
    if (c === "intake" || c === "school_intake_sex") return pick(["Co-educational", "Boys Only", "Girls Only"])
    if (c === "gender") return pick(["M", "F"])
    if (c === "sex") return i % 2
    if (c === "year_group" || c === "year_group_code") return pick(["NR", "RE", "01", "04", "07", "10", "12"])
    if (c === "stage" || c === "educational_stage") return pick(["Infant", "Junior", "Secondary"])
    if (c === "section") return pick(["A", "B", "C"])
    if (c === "session" || c === "session_type") return pick(["AM", "PM"])
    if (c === "code" || c === "mark_type") return pick(["/", "/", "/", "L", "I", "O"])
    if (c === "category") return pick(["present", "present", "late", "auth", "unauth"])
    if (c === "statistical_meaning") return pick(["Present", "Authorised Absence", "Unauthorised Absence"])
    if (c === "points") return pick([2, 1, 3, -1, -2])
    if (c === "polarity" || c === "type") return pick(["positive", "negative"])
    if (c === "nationality") return pick(["Qatari", "Egyptian", "Indian", "British", "Jordanian"])
    if (c === "house" || c === "house_name") return pick(["Falcon", "Oryx", "Pearl", "Dune"])
    if (c === "room" || c === "location") return pick(["Classroom 4", "Corridor", "Playground", "Canteen"])
    if (c === "designation" || c === "role") return pick(["Class Teacher", "Mathematics Teacher", "Vice Principal", "Science Teacher"])
    if (c === "behaviour_type" || c === "label" || c === "description")
        return pick(["Effort & persistence", "Late to lesson", "Kindness & respect", "Missing homework"])
    if (c === "academic_year") return "2026/2027"
    if (c === "capacity") return null
    if (c === "status") return pick([1, 1, 2])
    if (c === "month") return `2026-${String(1 + (i % 10)).padStart(2, "0")}`
    if (["amount", "gross", "basic", "housing", "tuition", "total", "annual"].includes(c)) return Math.round(1_000 + ((i * 7919) % 40_000))
    return `${col} ${i + 1}`
}

const sampleRows = (columns: string[], n = PREVIEW_ROWS) =>
    Array.from({ length: n }, (_, i) => Object.fromEntries(columns.map((c) => [c, sample(c, i)])))

/* ---------- filters and queries ---------- */

const parameters = (s: MockSource) =>
    Object.fromEntries(
        String(s.config.parameters ?? "")
            .split("\n")
            .map((l) => l.split("=").map((x) => x.trim()))
            .filter((p) => p.length === 2 && p[0])
            .map(([k, v]) => [k, v]),
    )

/** Problems the source database would report for a filter or query, roughly. */
function sqlProblem(s: MockSource, sql: string): string | null {
    if (/;\s*\S/.test(sql) || /\b(insert|update|delete|drop|alter|truncate|create|exec|merge)\b/i.test(sql.replace(/--.*$/gm, "")))
        return "Only a single read-only (SELECT) statement is allowed."
    const known = parameters(s)
    const unknown = [...sql.matchAll(/(?<![:\w]):([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]).find((p) => !(p in known))
    if (unknown) return `There is no parameter :${unknown}. Add it to the connection’s Parameters setting.`
    return null
}

/* ---------- streams ---------- */

function buildModel(state: MockState, s: MockSource, stream: string, body: Record<string, unknown>): MockModel {
    const kind = body.kind
    if (kind !== "table" && kind !== "query") invalid({ kind: ["The selected kind is invalid."] })

    if (kind === "query") {
        const sql = typeof body.sql === "string" ? body.sql.trim() : ""
        if (!sql) invalid({ sql: ["Write the query."] })
        const body_ = sql.replace(/--.*$/gm, "").trim()
        if (!/^(select|with)\b/i.test(body_)) invalid({ sql: ["The query must be a SELECT statement."] })
        const problem = sqlProblem(s, body_)
        if (problem) invalid({ sql: [problem] })
        const copied = state.selections.filter((t) => t.source_id === s.id).map((t) => t.name.toLowerCase())
        const missing = placeholders(sql).find((p) => !copied.includes(p.toLowerCase()))
        if (missing) invalid({ sql: [`{{${missing}}} isn’t a copied table of this source. Copy it on the Tables tab first.`] })
        if (!placeholders(sql).length) invalid({ sql: ["Read the copied tables through their {{table}} placeholders."] })
        const columns = queryColumns(sql)
        if (!columns.includes("id")) invalid({ sql: ["The query must return an id column."] })
        return {
            source_id: s.id,
            stream,
            kind,
            source_table_id: null,
            column_map: undefined,
            filter: null,
            sql,
            output_columns: columns,
            updated_at: iso(),
        }
    }

    const table = state.selections.find((t) => t.source_id === s.id && t.id === Number(body.source_table_id))
    if (!table) invalid({ source_table_id: ["Choose a copied table."] })
    const raw = body.column_map
    if (!raw || typeof raw !== "object") invalid({ column_map: ["The column map field is required."] })
    const map = Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).filter(([, c]) => typeof c === "string" && c.trim() !== ""),
    ) as Record<string, string>
    if (!map.id) invalid({ column_map: ["Map a column to id."] })
    const columns = table!.columns ?? replicable(table!.name)
    const unknown = Object.values(map).find((c) => !columns.includes(c))
    if (unknown) invalid({ column_map: [`${table!.name} has no copied column called ${unknown}.`] })
    const filter = typeof body.filter === "string" && body.filter.trim() ? body.filter.trim() : null
    const problem = filter ? sqlProblem(s, filter) : null
    if (problem) invalid({ column_map: [problem] })
    return {
        source_id: s.id,
        stream,
        kind,
        source_table_id: table!.id,
        column_map: map,
        filter,
        sql: null,
        output_columns: Object.keys(map),
        updated_at: iso(),
    }
}

/* ---------- sync ---------- */

function startSync(state: MockState, s: MockSource, mode: SyncMode) {
    const selections = state.selections.filter((t) => t.source_id === s.id)
    const streams =
        s.type === "database"
            ? state.models.filter((m) => m.source_id === s.id).map((m) => m.stream)
            : s.type === "spreadsheet"
              ? state.files.filter((f) => f.source_id === s.id).map((f) => f.stream)
              : s.type === "iss-export" && Array.isArray(s.config.streams) && s.config.streams.length
                ? (s.config.streams as string[])
                : streamsOf(s.platform)
    const start = Date.now()
    const id = state.next.run++
    state.runs.push({
        id,
        source_id: s.id,
        mode,
        status: "succeeded",
        stats: runStats(streams, mode, id),
        replication: s.type === "database" ? replicationStats(selections, mode, id) : null,
        error: null,
        started_at: iso(start),
        finished_at: iso(start + (mode === "full" ? 6_000 : 4_000)),
        applied: false,
    })
}

/* ---------- data sources ---------- */

function saveSource(state: MockState, body: Record<string, unknown>, existing?: MockSource): MockSource {
    const errors: Record<string, string[]> = {}
    const type = existing?.type ?? body.type
    const connector = typeof type === "string" ? connectorOf(type) : undefined

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) errors.name = ["The name field is required."]
    else if (name.length > 120) errors.name = ["The name field must not be greater than 120 characters."]
    else if (state.sources.some((s) => s.id !== existing?.id && s.name.toLowerCase() === name.toLowerCase()))
        errors.name = ["The name has already been taken."]

    if (existing && body.type !== undefined) errors.type = ["The type field is prohibited."]
    else if (!existing && !connector) errors.type = [type ? "The selected type is invalid." : "The type field is required."]

    const platforms = connector?.platforms ?? PLATFORM_CODES
    if (!body.platform) errors.platform = ["The platform field is required."]
    else if (!platforms.includes(body.platform as string)) errors.platform = ["The selected platform is invalid."]

    const tenant = typeof body.tenant === "string" ? body.tenant : ""
    if (!tenant) errors.tenant = ["The tenant field is required."]
    else if (!/^[A-Za-z0-9_-]+$/.test(tenant) || tenant.length > 64)
        errors.tenant = ["The tenant field must only contain letters, numbers, dashes, and underscores."]

    if (!body.schedule) errors.schedule = ["The schedule field is required."]
    else if (!validCron(body.schedule)) errors.schedule = ['The schedule must be a valid cron expression, e.g. "0 * * * *".']

    const config = { ...((body.config ?? {}) as Record<string, unknown>) }
    // saved secrets left empty are kept
    if (existing && connector)
        for (const f of connector.fields)
            if (f.type === "secret" && blank(config[f.key]) && existing.secrets.includes(f.key)) config[f.key] = "•"
    if (connector) Object.assign(errors, configErrors(connector, config))
    if (Object.keys(errors).length) invalid(errors)

    const normalised = normalise(connector!, config)
    const secretKeys = connector!.fields.filter((f) => f.type === "secret").map((f) => f.key)
    const now = iso()
    const fields = {
        name,
        platform: body.platform as string,
        tenant,
        schedule: (body.schedule as string).trim(),
        is_active: typeof body.is_active === "boolean" ? body.is_active : (existing?.is_active ?? true),
        config: Object.fromEntries(Object.entries(normalised).filter(([k]) => !secretKeys.includes(k))),
        secrets: secretKeys.filter((k) => k in normalised),
        updated_at: now,
    }
    if (existing) {
        Object.assign(existing, fields)
        return existing
    }
    const source: MockSource = {
        id: state.next.source++,
        type: connector!.type,
        status: "new",
        last_synced_at: null,
        last_error: null,
        created_at: now,
        ...fields,
    }
    state.sources.push(source)
    return source
}

function testSource(state: MockState, s: MockSource) {
    if (!settingsComplete(s))
        return { ok: false, message: "The connection’s settings are incomplete. Fill them in and save first.", streams: [] }
    switch (s.type) {
        case "database": {
            const tables = state.selections.filter((t) => t.source_id === s.id).length
            const models = state.models.filter((m) => m.source_id === s.id).map((m) => m.stream)
            return {
                ok: true,
                message: `Connected; ${plural(tables, "table")} copied, ${models.length} dashboard ${models.length === 1 ? "stream" : "streams"} mapped`,
                streams: models,
            }
        }
        case "spreadsheet": {
            const files = state.files.filter((f) => f.source_id === s.id).map((f) => f.stream)
            return {
                ok: true,
                message: files.length ? `${plural(files.length, "file")} uploaded` : "No files uploaded yet",
                streams: files,
            }
        }
        case "push-ingest":
            return { ok: true, message: "Ready to receive records; nothing has been pushed yet", streams: streamsOf(s.platform) }
        default: {
            const streams =
                Array.isArray(s.config.streams) && s.config.streams.length ? (s.config.streams as string[]) : streamsOf(s.platform)
            return { ok: true, message: `Connected; ${plural(streams.length, "stream")} available`, streams }
        }
    }
}

/* ---------- router ---------- */

const hasFeature = (s: MockSource, feature: string) => (connectorOf(s.type)?.features as string[] | undefined)?.includes(feature) ?? false

export async function mockRequest<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    await sleep(LATENCY)
    const method = (init?.method ?? "GET").toUpperCase()
    const [route, query = ""] = path.split("?")
    const params = new URLSearchParams(query)
    const seg = route.split("/").map(decodeURIComponent)
    const body = (init?.body ?? {}) as Record<string, unknown>

    const state = load()
    const done = <R>(result: R, write = true): T => {
        if (write) save(state)
        return result as unknown as T
    }

    if (route === "connectors" && method === "GET") return done(CATALOG, false)

    if (seg[0] !== "data-sources") return notFound()

    if (seg.length === 1) {
        if (method === "GET")
            return done(
                [...state.sources]
                    .sort((a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name))
                    .map((s) => sourceResource(state, s)),
                false,
            )
        if (method === "POST") return done(sourceResource(state, saveSource(state, body)))
        return notFound()
    }

    const source = state.sources.find((s) => s.id === Number(seg[1])) ?? notFound()

    if (seg.length === 2) {
        if (method === "GET") return done(sourceResource(state, source), false)
        if (method === "PUT") return done(sourceResource(state, saveSource(state, body, source)))
        if (method === "DELETE") {
            state.sources = state.sources.filter((s) => s.id !== source.id)
            state.runs = state.runs.filter((r) => r.source_id !== source.id)
            state.selections = state.selections.filter((t) => t.source_id !== source.id)
            state.models = state.models.filter((m) => m.source_id !== source.id)
            state.files = state.files.filter((f) => f.source_id !== source.id)
            return done(undefined)
        }
        return notFound()
    }

    switch (seg[2]) {
        case "test":
            return done(testSource(state, source), false)

        case "sync": {
            const mode = (body.mode ?? "incremental") as SyncMode
            if (mode !== "incremental" && mode !== "full") invalid({ mode: ["The selected mode is invalid."] })
            startSync(state, source, mode)
            return done({ queued: true, mode })
        }

        case "runs":
            return done(
                runsOf(state, source.id)
                    .slice(0, Math.min(Math.max(Number(params.get("limit") ?? 20) || 20, 1), 100))
                    .map((r) => runResource(r)),
                false,
            )

        case "files":
            return files(state, source, method, seg[3], init?.body) as T

        case "tables":
            if (!hasFeature(source, "tables")) return notFound()
            return tables(state, source, method, seg[3], seg[4], body) as T

        case "streams":
            if (!hasFeature(source, "tables")) return notFound()
            return streams(state, source, method, seg[3], seg[4], body) as T
    }
    return notFound()
}

function files(state: MockState, s: MockSource, method: string, stream: string | undefined, body: unknown): UploadedFile[] | undefined {
    if (!hasFeature(s, "uploads")) return notFound()
    const list = () =>
        state.files
            .filter((f) => f.source_id === s.id)
            .sort((a, b) => a.stream.localeCompare(b.stream))
            .map(({ stream, name, size, uploaded_at }) => ({ stream, name, size, uploaded_at }))

    if (!stream && method === "GET") return list()
    if (!stream && method === "POST") {
        const form = body instanceof FormData ? body : new FormData()
        const target = form.get("stream")
        const file = form.get("file")
        const errors: Record<string, string[]> = {}
        if (typeof target !== "string" || !target) errors.stream = ["The stream field is required."]
        else if (!streamsOf(s.platform).includes(target)) errors.stream = ["The selected stream is invalid."]
        if (!(file instanceof File)) errors.file = ["The file field is required."]
        else if (!UPLOAD_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? ""))
            errors.file = [`The file field must have one of the following extensions: ${UPLOAD_EXTENSIONS.join(", ")}.`]
        else if (file.size > 20 * 1024 * 1024) errors.file = ["The file field must not be greater than 20480 kilobytes."]
        if (Object.keys(errors).length) invalid(errors)
        const f = file as File
        state.files = state.files.filter((x) => !(x.source_id === s.id && x.stream === target))
        state.files.push({ source_id: s.id, stream: target as string, name: f.name, size: f.size, uploaded_at: iso() })
        save(state)
        return list()
    }
    if (stream && method === "DELETE") {
        state.files = state.files.filter((x) => !(x.source_id === s.id && x.stream === stream))
        save(state)
        return undefined
    }
    return notFound()
}

function tables(
    state: MockState,
    s: MockSource,
    method: string,
    name: string | undefined,
    action: string | undefined,
    body: Record<string, unknown>,
): { tables: SourceTableRow[] } | TableDetail | TableSelection | { rows: Record<string, unknown>[] } | undefined {
    const selected = state.selections.filter((t) => t.source_id === s.id)
    const selectionOf = (n: string) => selected.find((t) => t.name.toLowerCase() === n.toLowerCase())

    if (!name) {
        if (method !== "GET") return notFound()
        const rows: SourceTableRow[] = [...SOURCE_DB]
            .sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name))
            .map((t) => ({
                schema: null,
                name: t.name,
                qualified: t.name,
                rows: t.rows,
                size: t.size,
                selection: selectionResource(state, selectionOf(t.name)),
            }))
        const missing = selected
            .filter((t) => !dbTable(t.name))
            .map((t) => ({
                schema: null,
                name: t.name,
                qualified: t.name,
                rows: null,
                size: null,
                missing: true,
                selection: selectionResource(state, t),
            }))
        return { tables: [...missing, ...rows] }
    }

    if (method === "DELETE" && !action) {
        const t = selectionOf(name) ?? notFound("This table isn’t copied.")
        const users = usedBy(state, t)
        if (users.length) throw new ApiError(`Remove it from the dashboard streams that use it first: ${users.join(", ")}.`, 409)
        state.selections = state.selections.filter((x) => x.id !== t.id)
        save(state)
        return undefined
    }

    const db = dbTable(name) ?? notFound(`The source has no table called ${name}.`)
    const names = db.columns.filter((c) => c.replicable).map((c) => c.name)

    if (method === "GET" && !action)
        return {
            schema: null,
            name: db.name,
            qualified: db.name,
            columns: db.columns,
            primary_key: db.primary_key,
            suggested_cursor: db.suggested_cursor,
            selection: selectionResource(state, selectionOf(db.name)),
        }

    if (method === "POST" && action === "preview") {
        const filter = typeof body.filter === "string" ? body.filter.trim() : ""
        const problem = filter ? sqlProblem(s, filter) : null
        if (problem) invalid({ filter: [problem] })
        const columns =
            Array.isArray(body.columns) && body.columns.length ? (body.columns as string[]).filter((c) => names.includes(c)) : names
        return { rows: sampleRows(columns, Math.min(PREVIEW_ROWS, db.rows)) }
    }

    if (method === "PUT" && !action) {
        const errors: Record<string, string[]> = {}
        const columns = Array.isArray(body.columns) ? (body.columns as string[]) : null
        const key = Array.isArray(body.primary_key) ? (body.primary_key as string[]) : []
        const cursor = typeof body.cursor_column === "string" && body.cursor_column ? body.cursor_column : null
        const filter = typeof body.filter === "string" && body.filter.trim() ? body.filter.trim() : null
        if (columns?.some((c) => !names.includes(c))) errors.columns = ["The selected columns are invalid."]
        if (!key.length) errors.primary_key = ["Choose the column(s) that identify a row."]
        else if (key.length > 4) errors.primary_key = ["The primary key field must not have more than 4 items."]
        else if (key.some((c) => !names.includes(c))) errors.primary_key = ["The selected primary key is invalid."]
        if (cursor && !names.includes(cursor)) errors.cursor_column = ["The selected cursor column is invalid."]
        const problem = filter ? sqlProblem(s, filter) : null
        if (problem) errors.filter = [`The filter doesn’t run on the source: ${problem}`]
        if (Object.keys(errors).length) invalid(errors)

        let copied = columns ? [...new Set([...key, ...(cursor ? [cursor] : []), ...columns])] : null
        if (copied && copied.length >= names.length) copied = null
        const settings = { columns: copied, primary_key: key, cursor_column: cursor, filter }
        const existing = selectionOf(db.name)
        const rows = filter ? Math.max(1, Math.round(db.rows * 0.3)) : db.rows
        if (existing) Object.assign(existing, settings, { rows })
        else
            state.selections.push({
                id: state.next.selection++,
                source_id: s.id,
                name: db.name,
                ...settings,
                rows,
                last_synced_at: null,
                last_error: null,
            })
        save(state)
        return selectionResource(
            state,
            state.selections.find((t) => t.source_id === s.id && t.name === db.name),
        )!
    }

    return notFound()
}

function streams(
    state: MockState,
    s: MockSource,
    method: string,
    stream: string | undefined,
    action: string | undefined,
    body: Record<string, unknown>,
) {
    const copied = state.selections.filter((t) => t.source_id === s.id)

    if (!stream) {
        if (method !== "GET") return notFound()
        return {
            streams: streamsOf(s.platform).map((name) => ({
                stream: name,
                fields: streamFields(s.platform, name)!,
                model: modelResource(state.models.find((m) => m.source_id === s.id && m.stream === name)),
            })),
            tables: copied.map((t) => ({
                id: t.id,
                qualified: t.name,
                placeholder: `{{${t.name}}}`,
                columns: t.columns ?? replicable(t.name),
                rows: t.rows,
            })),
        }
    }

    if (!streamFields(s.platform, stream)) return notFound(`${s.platform} has no stream called ${stream}.`)

    if (method === "POST" && action === "preview") {
        const model = buildModel(state, s, stream, body as StreamModelInput & Record<string, unknown>)
        const columns = model.output_columns ?? []
        const rows =
            model.kind === "table"
                ? sampleRows(Object.values(model.column_map ?? {})).map((r) =>
                      Object.fromEntries(Object.entries(model.column_map ?? {}).map(([to, from]) => [to, r[from]])),
                  )
                : sampleRows(columns)
        return { columns, rows }
    }

    if (method === "PUT" && !action) {
        const model = buildModel(state, s, stream, body)
        state.models = [...state.models.filter((m) => !(m.source_id === s.id && m.stream === stream)), model]
        save(state)
        return modelResource(model)
    }

    if (method === "DELETE" && !action) {
        state.models = state.models.filter((m) => !(m.source_id === s.id && m.stream === stream))
        save(state)
        return undefined
    }

    return notFound()
}
