"use client"

import { DATA_SOURCE } from "@/lib/data-source"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

/* Shapes returned by the CIS API (issCisApi /api/v1/admin), through app/api/admin/connections. */

export type FieldType = "text" | "textarea" | "url" | "secret" | "number" | "boolean" | "select" | "list" | "path" | "map"

export interface ConfigField {
    key: string
    label: string
    type: FieldType
    required: boolean
    help: string | null
    placeholder: string | null
    options: { value: string; label: string }[]
    default: unknown
    /** only shown (and required) when other settings have one of these values */
    when: Record<string, string | string[]> | null
    /** editor hint for textarea and map values */
    language: "sql" | "json" | "text" | null
    /** a secret the CIS generates when left empty */
    generated: boolean
}

/** Extra panels a connector's sources need on their page. */
export type ConnectorFeature = "uploads" | "ingest" | "tables"

export interface Connector {
    type: string
    label: string
    description: string
    category: string
    icon: string
    /** platforms this connector can feed; null for any */
    platforms: string[] | null
    fields: ConfigField[]
    features: ConnectorFeature[]
}

export interface PlannedConnector {
    type: string
    label: string
    description: string
    category: string
    icon: string
}

export interface Catalog {
    connectors: Connector[]
    planned: PlannedConnector[]
    platforms: { code: string; streams: string[] }[]
    default_schedule: string
}

export type SourceStatus = "new" | "healthy" | "degraded" | "failing"
export type RunStatus = "running" | "succeeded" | "degraded" | "failed"
export type SyncMode = "incremental" | "full"

export interface StreamStats {
    read: number
    deleted: number
    active: number
    mart?: number
}

export interface SyncRun {
    id: number
    mode: SyncMode
    status: RunStatus
    stats: Record<string, StreamStats>
    /** database sources: per copied table */
    replication: Record<string, { read: number; deleted: number; rows: number; warning?: string }> | null
    error: string | null
    started_at: string
    finished_at: string | null
    duration_seconds: number | null
}

export interface DataSource {
    id: number
    name: string
    type: string
    connector: { label: string; category: string; icon: string; features: ConnectorFeature[] }
    /** settings incomplete (e.g. a seeded connection waiting for its credentials) */
    /** the connector's settings are filled in */
    settings_complete: boolean
    needs_setup: boolean
    /** database sources: how many tables are copied and dashboard streams mapped */
    tables: { copied: number; streams: number } | null
    /** push-ingest sources: the endpoint to post records to, with {stream} as a placeholder */
    ingest_url: string | null
    platform: string
    tenant: string
    schedule: string
    is_active: boolean
    status: SourceStatus
    last_synced_at: string | null
    last_error: string | null
    config: Record<string, unknown>
    /** secret settings that have a saved value (their values are never sent) */
    secrets: string[]
    latest_run?: SyncRun | null
    created_at: string
}

export interface SourceInput {
    name: string
    type?: string
    platform: string
    tenant: string
    schedule: string
    is_active: boolean
    config: Record<string, unknown>
}

export interface UploadedFile {
    stream: string
    name: string
    size: number
    uploaded_at: string
}

export interface TestResult {
    ok: boolean
    message: string
    streams: string[]
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public errors: Record<string, string[]> = {},
    ) {
        super(message)
    }
}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    // the preview has no CIS API: the demo connections are answered in the browser
    if (DATA_SOURCE === "mock") return (await import("@/mock/connections")).mockRequest<T>(path, init)

    const form = init?.body instanceof FormData
    const res = await fetch(`/api/admin/connections/${path}`, {
        method: init?.method ?? "GET",
        headers:
            init?.body === undefined || form
                ? { Accept: "application/json" }
                : { "Content-Type": "application/json", Accept: "application/json" },
        body: init?.body === undefined ? undefined : form ? (init.body as FormData) : JSON.stringify(init.body),
    })
    if (res.status === 204) return undefined as T
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(json.message ?? `Request failed (${res.status})`, res.status, json.errors)
    return json.data as T
}

const keys = {
    catalog: ["connections", "catalog"] as const,
    sources: ["connections", "sources"] as const,
    source: (id: number) => ["connections", "sources", id] as const,
    runs: (id: number) => ["connections", "sources", id, "runs"] as const,
    files: (id: number) => ["connections", "sources", id, "files"] as const,
    tables: (id: number) => ["connections", "sources", id, "tables"] as const,
    table: (id: number, name: string) => ["connections", "sources", id, "tables", name] as const,
    streams: (id: number) => ["connections", "sources", id, "streams"] as const,
}

export const useCatalog = () => useQuery({ queryKey: keys.catalog, queryFn: () => request<Catalog>("connectors") })

/** Refreshes every 10s so status and last-sync times stay current while the page is open. */
export const useDataSources = () =>
    useQuery({ queryKey: keys.sources, queryFn: () => request<DataSource[]>("data-sources"), staleTime: 0, refetchInterval: 10_000 })

export const useDataSource = (id: number) =>
    useQuery({ queryKey: keys.source(id), queryFn: () => request<DataSource>(`data-sources/${id}`), staleTime: 0 })

/** Polls quickly while a run is in progress or a sync was just queued. */
export const useRuns = (id: number, fast: boolean) =>
    useQuery({
        queryKey: keys.runs(id),
        queryFn: () => request<SyncRun[]>(`data-sources/${id}/runs`),
        staleTime: 0,
        refetchInterval: (q) => (fast || q.state.data?.[0]?.status === "running" ? 2_500 : 15_000),
    })

export function useSaveDataSource(id?: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: SourceInput) =>
            request<DataSource>(id ? `data-sources/${id}` : "data-sources", { method: id ? "PUT" : "POST", body: input }),
        onSuccess: (source) => {
            qc.setQueryData(keys.source(source.id), source)
            qc.invalidateQueries({ queryKey: keys.sources })
        },
    })
}

export function useDeleteDataSource(id: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => request<void>(`data-sources/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.removeQueries({ queryKey: keys.source(id) })
            qc.invalidateQueries({ queryKey: keys.sources })
        },
    })
}

export const useTestDataSource = (id: number) =>
    useMutation({ mutationFn: () => request<TestResult>(`data-sources/${id}/test`, { method: "POST" }) })

/** Spreadsheet sources: the uploaded file per stream. */
export const useFiles = (id: number, enabled: boolean) =>
    useQuery({ queryKey: keys.files(id), queryFn: () => request<UploadedFile[]>(`data-sources/${id}/files`), staleTime: 0, enabled })

export function useUploadFile(id: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ stream, file }: { stream: string; file: File }) => {
            const body = new FormData()
            body.append("stream", stream)
            body.append("file", file)
            return request<UploadedFile[]>(`data-sources/${id}/files`, { method: "POST", body })
        },
        onSuccess: (files) => qc.setQueryData(keys.files(id), files),
    })
}

export function useDeleteFile(id: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (stream: string) => request<void>(`data-sources/${id}/files/${stream}`, { method: "DELETE" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.files(id) }),
    })
}

export function useSyncDataSource(id: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (mode: SyncMode) =>
            request<{ queued: boolean; mode: SyncMode }>(`data-sources/${id}/sync`, { method: "POST", body: { mode } }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.runs(id) })
            qc.invalidateQueries({ queryKey: keys.sources })
        },
    })
}

/* Database sources: the tables to copy (Tables tab) and how dashboard streams are built from them. */

export interface TableSelection {
    id: number
    qualified: string
    /** columns chosen to copy; null for all */
    columns: string[] | null
    copied_columns: string[]
    primary_key: string[]
    cursor_column: string | null
    filter: string | null
    replica_table: string
    rows: number
    last_synced_at: string | null
    last_error: string | null
    used_by: string[]
}

export interface SourceTableRow {
    schema: string | null
    name: string
    qualified: string
    rows: number | null
    size: number | null
    /** selected, but the source no longer has it */
    missing?: boolean
    selection: TableSelection | null
}

export interface TableDetail {
    schema: string | null
    name: string
    qualified: string
    columns: { name: string; type: string; type_name: string; nullable: boolean; replicable: boolean }[]
    primary_key: string[]
    suggested_cursor: string | null
    selection: TableSelection | null
}

export interface TableInput {
    columns: string[] | null
    primary_key: string[]
    cursor_column: string | null
    filter: string | null
}

export interface StreamField {
    name: string
    cast: string
    required: boolean
}

export interface StreamModelInput {
    kind: "table" | "query"
    source_table_id?: number | null
    column_map?: Record<string, string>
    filter?: string | null
    sql?: string | null
}

export interface StreamModel extends StreamModelInput {
    output_columns: string[] | null
    updated_at: string | null
}

export interface StreamsCatalog {
    streams: { stream: string; fields: StreamField[]; model: StreamModel | null }[]
    tables: { id: number; qualified: string; placeholder: string; columns: string[]; rows: number }[]
}

export interface Preview {
    columns: string[]
    rows: Record<string, unknown>[]
}

const tablePath = (id: number, name: string) => `data-sources/${id}/tables/${encodeURIComponent(name)}`

export function useSourceTables(id: number) {
    const qc = useQueryClient()
    const query = useQuery({ queryKey: keys.tables(id), queryFn: () => request<{ tables: SourceTableRow[] }>(`data-sources/${id}/tables`), staleTime: 30_000 })
    const refresh = useMutation({
        mutationFn: () => request<{ tables: SourceTableRow[] }>(`data-sources/${id}/tables?refresh=1`),
        onSuccess: (data) => qc.setQueryData(keys.tables(id), data),
    })
    return { ...query, refresh }
}

export const useSourceTable = (id: number, name: string | null) =>
    useQuery({ queryKey: keys.table(id, name ?? ""), queryFn: () => request<TableDetail>(tablePath(id, name!)), enabled: !!name, staleTime: 0 })

export const usePreviewTable = (id: number, name: string) =>
    useMutation({
        mutationFn: (input: { columns: string[] | null; filter: string | null }) =>
            request<{ rows: Record<string, unknown>[] }>(`${tablePath(id, name)}/preview`, {
                method: "POST",
                body: { ...(input.columns ? { columns: input.columns } : {}), filter: input.filter },
            }),
    })

export function useSaveTable(id: number, name: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: TableInput) => request<TableSelection>(tablePath(id, name), { method: "PUT", body: input }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.tables(id) })
            qc.invalidateQueries({ queryKey: keys.streams(id) })
            qc.invalidateQueries({ queryKey: keys.source(id) })
        },
    })
}

export function useRemoveTable(id: number) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (name: string) => request<void>(tablePath(id, name), { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.tables(id) })
            qc.invalidateQueries({ queryKey: keys.streams(id) })
            qc.invalidateQueries({ queryKey: keys.source(id) })
        },
    })
}

export const useStreamModels = (id: number) =>
    useQuery({ queryKey: keys.streams(id), queryFn: () => request<StreamsCatalog>(`data-sources/${id}/streams`), staleTime: 0 })

export const usePreviewStream = (id: number, stream: string) =>
    useMutation({ mutationFn: (input: StreamModelInput) => request<Preview>(`data-sources/${id}/streams/${stream}/preview`, { method: "POST", body: input }) })

export function useSaveStream(id: number, stream: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: StreamModelInput) => request<StreamModel>(`data-sources/${id}/streams/${stream}`, { method: "PUT", body: input }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.streams(id) })
            qc.invalidateQueries({ queryKey: keys.tables(id) })
            qc.invalidateQueries({ queryKey: keys.source(id) })
        },
    })
}

export function useRemoveStream(id: number, stream: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => request<void>(`data-sources/${id}/streams/${stream}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.streams(id) })
            qc.invalidateQueries({ queryKey: keys.tables(id) })
            qc.invalidateQueries({ queryKey: keys.source(id) })
        },
    })
}
