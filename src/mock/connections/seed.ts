import type { StreamModelInput, StreamStats, SyncMode, SyncRun, TableDetail } from "@/features/connections/api"
import { streamsOf } from "./catalog"

// The demo connections the preview starts with, shaped like issCisApi's DataSourceSeeder output
// (database/seeders/DataSourceSeeder.php) after a few hours of syncs. Hosts, database names and
// accounts are placeholders; secret values are never stored, only which secrets are "set".

export interface MockSource {
    id: number
    name: string
    type: string
    platform: string
    tenant: string
    schedule: string
    is_active: boolean
    status: "new" | "healthy" | "degraded" | "failing"
    last_synced_at: string | null
    last_error: string | null
    /** non-secret settings */
    config: Record<string, unknown>
    /** secret settings that have a value */
    secrets: string[]
    created_at: string
    updated_at: string
}

export interface MockRun extends Omit<SyncRun, "duration_seconds"> {
    source_id: number
    /** whether its outcome has been written to the source (once the run is over) */
    applied: boolean
}

export interface MockSelection {
    id: number
    source_id: number
    name: string
    columns: string[] | null
    primary_key: string[]
    cursor_column: string | null
    filter: string | null
    rows: number
    last_synced_at: string | null
    last_error: string | null
}

export interface MockModel extends StreamModelInput {
    source_id: number
    stream: string
    output_columns: string[] | null
    updated_at: string | null
}

export interface MockFile {
    source_id: number
    stream: string
    name: string
    size: number
    uploaded_at: string
}

export interface MockState {
    version: number
    next: { source: number; run: number; selection: number }
    sources: MockSource[]
    runs: MockRun[]
    selections: MockSelection[]
    models: MockModel[]
    files: MockFile[]
}

/* ---------- the demo issEduApi database (what the Tables tab browses) ---------- */

export interface SourceDbTable extends Omit<TableDetail, "selection" | "schema" | "qualified"> {
    rows: number
    size: number
}

/** SQL Server column type from the column name, close enough to issEduApi's schema for the demo. */
function columnOf(name: string): TableDetail["columns"][number] {
    const [type, type_name] =
        name === "uid" || name.endsWith("_uid") || name === "recorded_by" || name === "created_by"
            ? ["nvarchar(36)", "nvarchar"]
            : name.endsWith("_at") || name === "datetime"
              ? ["datetime2(0)", "datetime2"]
              : name === "date" || name.endsWith("_date")
                ? ["date", "date"]
                : name.startsWith("is_")
                  ? ["bit", "bit"]
                  : name === "points" || name === "sex" || name === "status"
                    ? ["int", "int"]
                    : name === "photo"
                      ? ["varbinary(max)", "varbinary"]
                      : name === "description" || name === "notes"
                        ? ["nvarchar(max)", "nvarchar"]
                        : ["nvarchar(255)", "nvarchar"]
    return { name, type, type_name, nullable: name !== "uid", replicable: type_name !== "varbinary" }
}

const STAMPS = ["created_at", "updated_at", "deleted_at"]

/** name, row count, columns (the copied ones from tables.php, then the ones it leaves out) */
const DB_TABLES: [string, number, string[]][] = [
    [
        "tbl_school_student_attendances",
        1_284_600,
        ["uid", "student_uid", "mark_type_uid", "date", "session_type", "notes", "created_by", ...STAMPS],
    ],
    [
        "tbl_behaviours",
        41_820,
        ["uid", "behaviour_type_uid", "behaviour_severity_uid", "room_uid", "recorded_by", "datetime", "description", ...STAMPS],
    ],
    ["tbl_behaviour_students", 46_310, ["uid", "behaviour_uid", "student_uid", ...STAMPS]],
    [
        "tbl_profiles",
        9_870,
        ["uid", "first_name", "last_name", "sex", "nationality_uid", "date_of_birth", "national_id", "email", "phone", "photo", ...STAMPS],
    ],
    ["tbl_enrollments", 8_420, ["uid", "student_uid", "section_uid", "is_active", "status", "enrolled_date", ...STAMPS]],
    ["tbl_students", 6_150, ["uid", "school_uid", "profile_uid", "is_active", "admission_number", ...STAMPS]],
    ["tbl_house_students", 5_960, ["uid", "house_uid", "student_uid", ...STAMPS]],
    ["tbl_staff", 742, ["uid", "first_name", "last_name", "designation_uid", "email", "phone", "national_id", ...STAMPS]],
    ["tbl_sections", 318, ["uid", "year_group_uid", "homeroom_teacher_uid", "section", "room_uid", ...STAMPS]],
    ["tbl_rooms", 264, ["uid", "room", "building", ...STAMPS]],
    ["tbl_nationalities", 196, ["uid", "nationality", "iso_code", ...STAMPS]],
    ["tbl_year_groups", 126, ["uid", "educational_stage_uid", "year_group_code", "year_group_name", ...STAMPS]],
    ["tbl_designations", 58, ["uid", "designation", ...STAMPS]],
    ["tbl_mark_types", 42, ["uid", "mark_type", "description", "statistical_meaning", "category", ...STAMPS]],
    ["tbl_educational_stages", 27, ["uid", "academic_year_uid", "educational_stage", ...STAMPS]],
    ["tbl_behaviour_type_severities", 24, ["uid", "behaviour_type_uid", "behaviour_severity_uid", ...STAMPS]],
    ["tbl_behaviour_types", 22, ["uid", "behaviour_type", "description", ...STAMPS]],
    ["tbl_academic_years", 9, ["uid", "academic_year", "school_uid", "start_date", "end_date", "status", ...STAMPS]],
    ["tbl_behaviour_severities", 8, ["uid", "type", "points", ...STAMPS]],
    ["tbl_houses", 4, ["uid", "house_name", "colour", ...STAMPS]],
    ["tbl_schools", 3, ["uid", "school_code", "school_name", "school_intake_sex", "address", ...STAMPS]],
    // not copied by the seeded connection
    ["tbl_audit_logs", 2_418_300, ["uid", "user_uid", "action", "subject_type", "subject_uid", "description", ...STAMPS]],
    ["tbl_lesson_attendances", 3_905_120, ["uid", "student_uid", "lesson_uid", "mark_type_uid", "date", ...STAMPS]],
    ["tbl_assessment_results", 186_400, ["uid", "student_uid", "aspect_uid", "result_set_uid", "value", ...STAMPS]],
    ["tbl_guardians", 11_240, ["uid", "profile_uid", "relationship", "email", "phone", ...STAMPS]],
    ["tbl_timetable_lessons", 9_312, ["uid", "section_uid", "subject_uid", "staff_uid", "day", "period", ...STAMPS]],
    ["tbl_subjects", 87, ["uid", "subject_name", "subject_code", ...STAMPS]],
    ["migrations", 412, ["id", "migration", "batch"]],
]

export const SOURCE_DB: SourceDbTable[] = DB_TABLES.map(([name, rows, columns]) => ({
    name,
    rows,
    size: Math.round(rows * columns.length * 38),
    columns: columns.map((c) =>
        c === "id" || c === "batch" ? { name: c, type: "int", type_name: "int", nullable: false, replicable: true } : columnOf(c),
    ),
    primary_key: columns.includes("uid") ? ["uid"] : ["id"],
    suggested_cursor: columns.includes("updated_at") ? "updated_at" : null,
}))

/* ---------- seeded connections ---------- */

const ISSEDU_TABLES: Record<string, { columns: string[]; filter?: string }> = {
    tbl_schools: { columns: ["uid", "school_code", "school_name", "school_intake_sex"] },
    tbl_mark_types: { columns: ["uid", "mark_type", "description", "statistical_meaning", "category"] },
    tbl_behaviour_types: { columns: ["uid", "behaviour_type"] },
    tbl_behaviour_severities: { columns: ["uid", "type", "points"] },
    tbl_behaviour_type_severities: { columns: ["uid", "behaviour_type_uid", "behaviour_severity_uid"] },
    tbl_staff: { columns: ["uid", "first_name", "last_name", "designation_uid"] },
    tbl_designations: { columns: ["uid", "designation"] },
    tbl_academic_years: { columns: ["uid", "academic_year", "school_uid", "start_date", "end_date", "status"] },
    tbl_educational_stages: { columns: ["uid", "academic_year_uid", "educational_stage"] },
    tbl_year_groups: { columns: ["uid", "educational_stage_uid", "year_group_code"] },
    tbl_sections: { columns: ["uid", "year_group_uid", "homeroom_teacher_uid", "section"] },
    tbl_enrollments: { columns: ["uid", "student_uid", "section_uid", "is_active", "status"] },
    tbl_students: { columns: ["uid", "school_uid", "profile_uid", "is_active"] },
    tbl_profiles: {
        columns: ["uid", "first_name", "last_name", "sex", "nationality_uid"],
        filter: "uid IN (SELECT profile_uid FROM tbl_students)",
    },
    tbl_nationalities: { columns: ["uid", "nationality"] },
    tbl_houses: { columns: ["uid", "house_name"] },
    tbl_house_students: { columns: ["uid", "house_uid", "student_uid", "created_at"] },
    tbl_rooms: { columns: ["uid", "room"] },
    tbl_school_student_attendances: {
        columns: ["uid", "student_uid", "mark_type_uid", "date", "session_type"],
        filter: "session_type IN ('AM', 'PM') AND date >= :from_date",
    },
    tbl_behaviours: {
        columns: ["uid", "behaviour_type_uid", "behaviour_severity_uid", "room_uid", "recorded_by", "datetime"],
        filter: "datetime >= :from_date",
    },
    tbl_behaviour_students: {
        columns: ["uid", "behaviour_uid", "student_uid"],
        filter: "behaviour_uid IN (SELECT uid FROM tbl_behaviours WHERE datetime >= :from_date)",
    },
}

/** issEduApi's dashboard-stream queries (database/seeders/connections/issedu/streams/*.sql). */
const ISSEDU_STREAMS: Record<string, string> = {
    schools: `-- One row per school. intake is Girls, Boys or Co-educational.
SELECT
    s.school_code AS id,
    s.school_name AS name,
    TRIM(REPLACE(REPLACE(REPLACE(s.school_name, ' Academy For ', ' '), ' Academy for ', ' '), ' Academy', '')) AS short_name,
    CASE s.school_intake_sex WHEN 'Girls Only' THEN 'Girls' WHEN 'Boys Only' THEN 'Boys' ELSE 'Co-educational' END AS intake,
    s._cis_synced_at AS updated_at
FROM {{tbl_schools}} s
WHERE s.deleted_at IS NULL`,
    mark_codes: `-- Register mark codes and how they count. A code used with several meanings takes the strongest:
-- late, then present (incl. approved educational activity), authorised, unauthorised, then
-- "none" (attendance not required, no mark), which is left out of attendance.
SELECT
    m.mark_type AS id,
    MIN(m.description) AS label,
    CASE MIN(CASE
            WHEN m.category = 'late' THEN 1
            WHEN m.statistical_meaning IN ('Present', 'Approved Educational Activity') THEN 2
            WHEN m.statistical_meaning = 'Authorised Absence' THEN 3
            WHEN m.statistical_meaning = 'Unauthorised Absence' THEN 4
            ELSE 5 END)
        WHEN 1 THEN 'late' WHEN 2 THEN 'present' WHEN 3 THEN 'auth' WHEN 4 THEN 'unauth' ELSE 'none' END AS category,
    MAX(m._cis_synced_at) AS updated_at
FROM {{tbl_mark_types}} m
WHERE m.deleted_at IS NULL AND m.mark_type IS NOT NULL
GROUP BY m.mark_type`,
    behaviour_types: `-- Behaviour types; polarity comes from the severities the type is used with.
SELECT
    bt.uid AS id,
    bt.behaviour_type AS name,
    COALESCE((
        SELECT sv.type
        FROM {{tbl_behaviour_type_severities}} ts
        JOIN {{tbl_behaviour_severities}} sv ON sv.uid = ts.behaviour_severity_uid
        WHERE ts.behaviour_type_uid = bt.uid AND ts.deleted_at IS NULL
        LIMIT 1
    ), 'neutral') AS polarity,
    bt._cis_synced_at AS updated_at
FROM {{tbl_behaviour_types}} bt
WHERE bt.deleted_at IS NULL`,
    staff: `-- Staff names, for form tutors and who recorded behaviour.
SELECT
    st.uid AS id,
    TRIM(CONCAT(COALESCE(st.first_name, ''), ' ', COALESCE(st.last_name, ''))) AS name,
    NULL AS school,
    d.designation AS role,
    GREATEST(st._cis_synced_at, COALESCE(d._cis_synced_at, st._cis_synced_at)) AS updated_at
FROM {{tbl_staff}} st
LEFT JOIN {{tbl_designations}} d ON d.uid = st.designation_uid
WHERE st.deleted_at IS NULL`,
    sections: `-- Sections (classes) of the academic year. Year groups are normalised to NR, RE, 01 to 13.
SELECT
    sec.uid AS id,
    s.school_code AS school,
    CASE
        WHEN yg.year_group_code IN ('NR', 'NUR', 'N', 'Nursery') THEN 'NR'
        WHEN yg.year_group_code IN ('RE', 'R', 'Rc', 'REC', 'Reception') THEN 'RE'
        WHEN yg.year_group_code REGEXP '^[0-9]{1,2}$' THEN LPAD(yg.year_group_code, 2, '0')
        ELSE yg.year_group_code
    END AS year_group,
    st.educational_stage AS stage,
    sec.section AS section,
    NULL AS capacity,
    sec.homeroom_teacher_uid AS form_tutor_id,
    GREATEST(sec._cis_synced_at, yg._cis_synced_at, st._cis_synced_at, y._cis_synced_at) AS updated_at
FROM {{tbl_sections}} sec
JOIN {{tbl_year_groups}} yg ON yg.uid = sec.year_group_uid
JOIN {{tbl_educational_stages}} st ON st.uid = yg.educational_stage_uid
JOIN {{tbl_academic_years}} y ON y.uid = st.academic_year_uid
JOIN {{tbl_schools}} s ON s.uid = y.school_uid
WHERE y.academic_year = :academic_year
    AND sec.deleted_at IS NULL AND yg.deleted_at IS NULL AND st.deleted_at IS NULL`,
    students: `-- Students with an active enrolment in a section of the academic year.
SELECT
    stu.uid AS id,
    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS name,
    CASE p.sex WHEN 1 THEN 'F' ELSE 'M' END AS gender,
    s.school_code AS school,
    CASE
        WHEN yg.year_group_code IN ('NR', 'NUR', 'N', 'Nursery') THEN 'NR'
        WHEN yg.year_group_code IN ('RE', 'R', 'Rc', 'REC', 'Reception') THEN 'RE'
        WHEN yg.year_group_code REGEXP '^[0-9]{1,2}$' THEN LPAD(yg.year_group_code, 2, '0')
        ELSE yg.year_group_code
    END AS year_group,
    st.educational_stage AS stage,
    sec.section AS section,
    sec.uid AS section_key,
    (
        SELECT h.house_name
        FROM {{tbl_house_students}} hs
        JOIN {{tbl_houses}} h ON h.uid = hs.house_uid
        WHERE hs.student_uid = stu.uid AND hs.deleted_at IS NULL
        ORDER BY hs.created_at DESC
        LIMIT 1
    ) AS house,
    n.nationality AS nationality,
    GREATEST(stu._cis_synced_at, e._cis_synced_at, p._cis_synced_at, sec._cis_synced_at) AS updated_at
FROM {{tbl_enrollments}} e
JOIN {{tbl_students}} stu ON stu.uid = e.student_uid
JOIN {{tbl_profiles}} p ON p.uid = stu.profile_uid
JOIN {{tbl_sections}} sec ON sec.uid = e.section_uid
JOIN {{tbl_year_groups}} yg ON yg.uid = sec.year_group_uid
JOIN {{tbl_educational_stages}} st ON st.uid = yg.educational_stage_uid
JOIN {{tbl_academic_years}} y ON y.uid = st.academic_year_uid
JOIN {{tbl_schools}} s ON s.uid = y.school_uid
LEFT JOIN {{tbl_nationalities}} n ON n.uid = p.nationality_uid
WHERE y.academic_year = :academic_year
    AND e.is_active = 1 AND e.deleted_at IS NULL AND stu.deleted_at IS NULL AND sec.deleted_at IS NULL`,
    attendance_marks: `-- The daily AM / PM register marks (the copy already holds only those, for the school year).
SELECT
    CONCAT(a.student_uid, ':', a.date, ':', a.session_type) AS id,
    a.student_uid AS student_id,
    a.date AS date,
    a.session_type AS session,
    m.mark_type AS code,
    a._cis_synced_at AS updated_at
FROM {{tbl_school_student_attendances}} a
JOIN {{tbl_mark_types}} m ON m.uid = a.mark_type_uid
WHERE a.deleted_at IS NULL`,
    behaviour_events: `-- Behaviour records per student. Points are signed: positive severities add, negative ones subtract.
SELECT
    CONCAT(b.uid, ':', bs.student_uid) AS id,
    bs.student_uid AS student_id,
    DATE(b.datetime) AS date,
    b.behaviour_type_uid AS type,
    (CASE sv.type WHEN 'positive' THEN 1 WHEN 'negative' THEN -1 ELSE 0 END) * COALESCE(sv.points, 0) AS points,
    r.room AS location,
    b.recorded_by AS recorded_by,
    GREATEST(b._cis_synced_at, bs._cis_synced_at) AS updated_at
FROM {{tbl_behaviours}} b
JOIN {{tbl_behaviour_students}} bs ON bs.behaviour_uid = b.uid
LEFT JOIN {{tbl_behaviour_severities}} sv ON sv.uid = b.behaviour_severity_uid
LEFT JOIN {{tbl_rooms}} r ON r.uid = b.room_uid
WHERE b.deleted_at IS NULL AND bs.deleted_at IS NULL`,
}

/** The output columns of a SELECT: its "AS alias" names at the end of a line (the seeded queries' style). */
export const queryColumns = (sql: string) => [...new Set([...sql.matchAll(/\bAS\s+([a-z_][a-z0-9_]*)\s*,?\s*$/gim)].map((m) => m[1]))]

/** Copied tables a query reads, from its {{table}} placeholders. */
export const placeholders = (sql: string) => [...new Set([...sql.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((m) => m[1]))]

/** Typical record counts per stream, for run stats. */
export const STREAM_SIZE: Record<string, number> = {
    schools: 3,
    mark_codes: 15,
    behaviour_types: 11,
    staff: 312,
    sections: 92,
    students: 2_214,
    attendance_marks: 154_980,
    behaviour_events: 13_640,
    employees: 386,
    staff_attendance: 13_510,
    leave_taken: 1_420,
    leave_requests: 960,
    appraisals: 1_030,
    kpis: 1_490,
    fee_accounts: 2_214,
    invoices: 5_870,
    payments: 6_940,
    payroll_employees: 386,
    payroll_monthly: 3_860,
    budgets: 26,
    budget_actuals: 260,
    income: 70,
    cash_balances: 284,
}

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z")
const HOUR = 3_600_000

/** Stats for a run of a source: full runs read everything, incremental ones a small change set. */
export function runStats(streams: string[], mode: SyncMode, salt: number): Record<string, StreamStats> {
    return Object.fromEntries(
        streams.map((s, i) => {
            const size = STREAM_SIZE[s] ?? 100
            const churn = (salt * 7 + i * 13) % 17
            const read = mode === "full" ? size : size > 1_000 ? Math.round(size * (0.002 + churn / 4_000)) : churn % 3
            return [s, { read, deleted: mode === "full" ? churn % 4 : 0, active: size, mart: size }]
        }),
    )
}

export function replicationStats(selections: MockSelection[], mode: SyncMode, salt: number): SyncRun["replication"] {
    return Object.fromEntries(
        selections.map((t, i) => {
            const churn = (salt * 5 + i * 11) % 13
            const read = mode === "full" ? t.rows : t.rows > 1_000 ? Math.round(t.rows * (0.001 + churn / 6_000)) : churn % 2
            return [t.name, { read, deleted: mode === "full" ? 0 : churn % 3, rows: t.rows }]
        }),
    )
}

/** Run history: a full first sync, then hourly incremental ones up to the dashboards' as-of date. */
function history(source: MockSource, firstId: number, durations: [number, number], selections: MockSelection[] = []): MockRun[] {
    const streams = source.type === "database" ? Object.keys(ISSEDU_STREAMS) : streamsOf(source.platform)
    const last = Date.parse("2026-10-08T15:00:00Z")
    const starts = [last - 30 * HOUR, ...Array.from({ length: 7 }, (_, i) => last - (6 - i) * HOUR)]
    return starts.map((start, i) => {
        const mode: SyncMode = i === 0 ? "full" : "incremental"
        const seconds = mode === "full" ? durations[0] : durations[1] + ((i * 7) % 9)
        return {
            id: firstId + i,
            source_id: source.id,
            mode,
            status: "succeeded",
            stats: runStats(streams, mode, i + source.id),
            replication: source.type === "database" ? replicationStats(selections, mode, i) : null,
            error: null,
            started_at: iso(start),
            finished_at: iso(start + seconds * 1000),
            applied: true,
        }
    })
}

export function seedState(): MockState {
    const created = "2026-10-07T08:30:00Z"
    const synced = "2026-10-08T15:00:41Z"
    const sources: MockSource[] = [
        {
            id: 1,
            name: "issEduApi · SQL Server",
            type: "database",
            platform: "edu",
            tenant: "iss",
            schedule: "0 * * * *",
            is_active: true,
            status: "healthy",
            last_synced_at: synced,
            last_error: null,
            config: {
                driver: "sqlsrv",
                host: "sql.demo.local\\SQLEXPRESS",
                database: "issedu_demo",
                username: "cis_reader",
                trust_server_certificate: true,
                parameters: "academic_year = 2026/2027\nfrom_date = 2026-08-01",
            },
            secrets: ["password"],
            created_at: created,
            updated_at: created,
        },
        {
            id: 2,
            name: "HRM API",
            type: "iss-export",
            platform: "hr",
            tenant: "iss",
            schedule: "0 * * * *",
            is_active: true,
            status: "healthy",
            last_synced_at: "2026-10-08T15:00:12Z",
            last_error: null,
            config: { base_url: "https://hrm.example.com/api", auth: "token", per_page: 1000 },
            secrets: ["token"],
            created_at: created,
            updated_at: created,
        },
        {
            id: 3,
            name: "Finance API",
            type: "iss-export",
            platform: "fin",
            tenant: "iss",
            schedule: "0 * * * *",
            is_active: true,
            status: "healthy",
            last_synced_at: "2026-10-08T15:00:09Z",
            last_error: null,
            config: { base_url: "https://finance.example.com/api", auth: "token", per_page: 1000 },
            secrets: ["token"],
            created_at: created,
            updated_at: created,
        },
    ]

    const selections: MockSelection[] = Object.entries(ISSEDU_TABLES).map(([name, t], i) => {
        const db = SOURCE_DB.find((x) => x.name === name)!
        return {
            id: i + 1,
            source_id: 1,
            name,
            columns: [...t.columns, "updated_at", "deleted_at"],
            primary_key: ["uid"],
            cursor_column: "updated_at",
            filter: t.filter ?? null,
            // the large tables copy only the current school year
            rows: t.filter ? Math.round(db.rows * (name === "tbl_profiles" ? 0.62 : 0.14)) : db.rows,
            last_synced_at: synced,
            last_error: null,
        }
    })

    const models: MockModel[] = Object.entries(ISSEDU_STREAMS).map(([stream, sql]) => ({
        source_id: 1,
        stream,
        kind: "query",
        source_table_id: null,
        column_map: undefined,
        filter: null,
        sql,
        output_columns: queryColumns(sql),
        updated_at: created,
    }))

    const runs = [...history(sources[0], 1, [726, 34], selections), ...history(sources[1], 9, [48, 6]), ...history(sources[2], 17, [61, 7])]

    return {
        version: 1,
        next: { source: 4, run: runs.length + 1, selection: selections.length + 1 },
        sources,
        runs,
        selections,
        models,
        files: [],
    }
}
