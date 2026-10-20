import type { Catalog, ConfigField, Connector, StreamField } from "@/features/connections/api"

// The connection catalog as issCisApi serves it (GET /admin/connectors): its connector classes'
// definition() forms (app/Connectors/*) and the canonical streams of config/cis_streams.php.

const field = (key: string, label: string, type: ConfigField["type"] = "text", extra: Partial<ConfigField> = {}): ConfigField => ({
    key,
    label,
    type,
    required: false,
    help: null,
    placeholder: null,
    options: [],
    default: null,
    when: null,
    language: null,
    generated: false,
    ...extra,
})

const options = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }))

const clientCredentials = { auth: "client_credentials" }
const paged = { pagination: ["cursor", "next_url"] }

export const CONNECTORS: Connector[] = [
    {
        type: "iss-export",
        label: "ISS platform API",
        description:
            "Pulls the cis-export endpoints of an ISS app such as issEduApi, HRM or Finance. Incremental by updated_at, with paging.",
        category: "ISS platforms",
        icon: "server",
        platforms: null,
        features: [],
        fields: [
            field("base_url", "API base URL", "url", {
                required: true,
                placeholder: "https://isseduapi.test/api",
                help: "The CIS calls {base URL}/cis-export/{stream}.",
            }),
            field("auth", "Authentication", "select", {
                required: true,
                default: "token",
                options: options({ token: "API token (Sanctum)", client_credentials: "OAuth client credentials (Passport)" }),
            }),
            field("token", "API token", "secret", {
                required: true,
                when: { auth: "token" },
                help: "A read-only token issued by the source app.",
            }),
            field("token_url", "Token URL", "url", {
                required: true,
                when: clientCredentials,
                placeholder: "https://isseduapi.test/oauth/token",
            }),
            field("client_id", "Client ID", "text", { required: true, when: clientCredentials }),
            field("client_secret", "Client secret", "secret", { required: true, when: clientCredentials }),
            field("scope", "Scope", "text", { when: clientCredentials, placeholder: "cis-export" }),
            field("entity", "Entity", "text", {
                placeholder: "e.g. AJA",
                help: "Sent as X-ISS-Entity to limit the export to one school or tenant. Leave empty for all.",
            }),
            field("per_page", "Page size", "number", { default: 1000, help: "Records per request." }),
            field("streams", "Streams", "list", { help: "Leave empty to pull every stream of the platform." }),
        ],
    },
    {
        type: "database",
        label: "SQL database",
        description:
            "Connects to a source database (MySQL, SQL Server, PostgreSQL): pick its tables to copy, then map them onto the dashboard streams.",
        category: "Databases",
        icon: "database",
        platforms: null,
        features: ["tables"],
        fields: [
            field("driver", "Database", "select", {
                required: true,
                default: "mysql",
                options: options({ mysql: "MySQL / MariaDB", sqlsrv: "SQL Server", pgsql: "PostgreSQL" }),
            }),
            field("host", "Host", "text", {
                required: true,
                placeholder: "db.internal or SERVER\\INSTANCE",
                help: "For a named SQL Server instance use SERVER\\INSTANCE and leave the port empty.",
            }),
            field("port", "Port", "number", { placeholder: "3306 / 1433 / 5432" }),
            field("database", "Database name", "text", { required: true }),
            field("username", "Username", "text", { required: true, help: "Use a login with read-only (SELECT) permission." }),
            field("password", "Password", "secret"),
            field("trust_server_certificate", "Trust the server certificate", "boolean", {
                default: false,
                when: { driver: "sqlsrv" },
                help: "Needed for SQL Server instances with a self-signed certificate.",
            }),
            field("parameters", "Parameters", "textarea", {
                language: "text",
                placeholder: "academic_year = 2025/2026\nfrom_date = 2025-08-01",
                help: "One name = value per line, usable as :name in table filters and dashboard-stream queries.",
            }),
        ],
    },
    {
        type: "rest-api",
        label: "REST API",
        description:
            "Any JSON API (accounting ERP, LMS, admissions CRM): an endpoint per stream, paging, and a field mapping onto the canonical streams.",
        category: "Third-party",
        icon: "globe",
        platforms: null,
        features: [],
        fields: [
            field("base_url", "Base URL", "url", { required: true, placeholder: "https://api.vendor.com/v2" }),
            field("auth", "Authentication", "select", {
                required: true,
                default: "bearer",
                options: options({ none: "None", bearer: "Bearer token", basic: "Basic (user + password)", header: "API key header" }),
            }),
            field("token", "Token", "secret", { required: true, when: { auth: "bearer" } }),
            field("username", "Username", "text", { required: true, when: { auth: "basic" } }),
            field("password", "Password", "secret", { required: true, when: { auth: "basic" } }),
            field("header_name", "Header name", "text", { required: true, default: "X-API-Key", when: { auth: "header" } }),
            field("header_value", "API key", "secret", { required: true, when: { auth: "header" } }),
            field("endpoints", "Endpoints", "map", {
                required: true,
                language: "text",
                placeholder: "/students?status=active",
                help: "Path (and query) for each stream, relative to the base URL. Leave a stream empty to skip it.",
            }),
            field("records_path", "Records path", "text", {
                default: "data",
                help: "Where the array of records is in each response, as a dot path. Empty when the response is the array.",
            }),
            field("pagination", "Paging", "select", {
                required: true,
                default: "none",
                options: options({ none: "None", page: "Page number", cursor: "Cursor", next_url: "Next link" }),
            }),
            field("page_param", "Page parameter", "text", { default: "page", when: { pagination: "page" } }),
            field("cursor_param", "Cursor parameter", "text", { default: "cursor", when: { pagination: "cursor" } }),
            field("next_path", "Next cursor / link path", "text", {
                required: true,
                default: "next_cursor",
                when: paged,
                help: "Dot path in the response to the next cursor (or next page URL); paging stops when it is empty.",
            }),
            field("updated_since_param", "Updated-since parameter", "text", {
                placeholder: "updated_since",
                help: "Query parameter for incremental syncs. Leave empty to read everything each time.",
            }),
            field("field_map", "Field mapping", "map", {
                language: "json",
                placeholder: '{"id": "uuid", "name": "profile.full_name"}',
                help: "JSON per stream: canonical field → the API's field (dot path). Unmapped fields are taken as named.",
            }),
        ],
    },
    {
        type: "spreadsheet",
        label: "Excel / CSV upload",
        description:
            "Budgets, targets and other data kept in spreadsheets: upload a CSV or Excel file per stream, checked before it loads.",
        category: "Files",
        icon: "sheet",
        platforms: null,
        features: ["uploads"],
        fields: [
            field("sheet", "Worksheet", "text", {
                placeholder: "First sheet",
                help: "Excel files only: the worksheet to read. Leave empty for the first one.",
            }),
            field("column_map", "Column mapping", "map", {
                language: "json",
                placeholder: '{"id": "Budget code", "annual": "FY total"}',
                help: "JSON per stream: canonical field → column header, for headers that differ from the field names.",
            }),
        ],
    },
    {
        type: "push-ingest",
        label: "Push ingest",
        description:
            "For systems that can only push: they post signed records to a CIS ingest endpoint, and each one is synced straight away.",
        category: "Third-party",
        icon: "webhook",
        platforms: null,
        features: ["ingest"],
        fields: [
            field("signing_secret", "Signing secret", "secret", {
                required: true,
                generated: true,
                help: "Shared with the sending system to sign each request (HMAC-SHA256). Leave empty to generate one.",
            }),
            field("sync_on_push", "Sync on every push", "boolean", {
                default: true,
                help: "Queue a sync as soon as records arrive. Off: they wait for the schedule.",
            }),
        ],
    },
    {
        type: "json-files",
        label: "JSON Lines files",
        description:
            "Reads cis-export records from a folder of .jsonl files, one per stream. For exports another system drops on a shared folder.",
        category: "Files",
        icon: "file",
        platforms: null,
        features: [],
        fields: [
            field("path", "Folder", "path", {
                required: true,
                placeholder: "D:\\exports\\cis",
                help: "Absolute, or relative to the CIS API. Files are read from <folder>/<platform>/<stream>.jsonl.",
            }),
        ],
    },
]

export const connectorOf = (type: string) => CONNECTORS.find((c) => c.type === type)

/**
 * Canonical streams per platform (config/cis_streams.php): key column first, then the payload fields
 * with their casts ("cast:field" columns are listed under the payload field's name).
 */
const STREAMS: Record<string, Record<string, [string, string][]>> = {
    edu: {
        schools: [
            ["name", "string"],
            ["short_name", "string"],
            ["intake", "string"],
        ],
        mark_codes: [
            ["label", "string"],
            ["category", "string"],
        ],
        behaviour_types: [
            ["name", "string"],
            ["polarity", "string"],
        ],
        staff: [
            ["name", "string"],
            ["school", "string"],
            ["role", "string"],
        ],
        sections: [
            ["school", "string"],
            ["year_group", "string"],
            ["stage", "string"],
            ["section", "string"],
            ["capacity", "int"],
            ["form_tutor_id", "string"],
            ["subject_teacher_ids", "json"],
        ],
        students: [
            ["name", "string"],
            ["gender", "string"],
            ["school", "string"],
            ["year_group", "string"],
            ["stage", "string"],
            ["section", "string"],
            ["section_key", "string"],
            ["house", "string"],
            ["nationality", "string"],
        ],
        attendance_marks: [
            ["student_id", "string"],
            ["date", "date"],
            ["session", "string"],
            ["code", "string"],
        ],
        behaviour_events: [
            ["student_id", "string"],
            ["date", "date"],
            ["type", "string"],
            ["points", "int"],
            ["location", "string"],
            ["recorded_by", "string"],
        ],
    },
    hr: {
        employees: [
            ["name", "string"],
            ["gender", "string"],
            ["location", "string"],
            ["department", "string"],
            ["role", "string"],
            ["teaching", "bool"],
            ["grade", "string"],
            ["nationality", "string"],
            ["hire_date", "date"],
            ["manager_id", "string"],
            ["entitlement_annual", "decimal"],
            ["entitlement_sick", "decimal"],
            ["section_keys", "json"],
            ["form_section", "string"],
        ],
        staff_attendance: [
            ["employee_id", "string"],
            ["date", "date"],
            ["code", "string"],
            ["late_minutes", "int"],
        ],
        leave_taken: [
            ["employee_id", "string"],
            ["month", "month"],
            ["type", "string"],
            ["days", "decimal"],
        ],
        leave_requests: [
            ["employee_id", "string"],
            ["type", "string"],
            ["from", "date"],
            ["days", "decimal"],
            ["status", "string"],
        ],
        appraisals: [
            ["employee_id", "string"],
            ["cycle", "string"],
            ["label", "string"],
            ["status", "string"],
            ["scores", "json"],
            ["overall", "decimal"],
            ["reviewer_id", "string"],
        ],
        kpis: [
            ["employee_id", "string"],
            ["name", "string"],
            ["target", "decimal"],
            ["actual", "decimal"],
            ["unit", "string"],
        ],
    },
    fin: {
        fee_accounts: [
            ["student_id", "string"],
            ["name", "string"],
            ["school", "string"],
            ["stage", "string"],
            ["year_group", "string"],
            ["section", "string"],
            ["transport", "bool"],
            ["discount", "string"],
            ["profile", "string"],
        ],
        invoices: [
            ["account_id", "string"],
            ["term", "string"],
            ["issued", "date"],
            ["tuition", "money"],
            ["resources", "money"],
            ["transport", "money"],
            ["discount", "money"],
            ["total", "money"],
            ["instalments", "json"],
        ],
        payments: [
            ["invoice_id", "string"],
            ["account_id", "string"],
            ["date", "date"],
            ["amount", "money"],
            ["method", "string"],
        ],
        payroll_employees: [
            ["name", "string"],
            ["role", "string"],
            ["location", "string"],
            ["department", "string"],
            ["teaching", "bool"],
            ["grade", "string"],
            ["hire_date", "date"],
            ["basic", "money"],
            ["housing", "money"],
            ["transport", "money"],
        ],
        payroll_monthly: [
            ["employee_id", "string"],
            ["month", "month"],
            ["gross", "money"],
        ],
        budgets: [
            ["location", "string"],
            ["category", "string"],
            ["annual", "money"],
            ["months", "json"],
        ],
        budget_actuals: [
            ["location", "string"],
            ["category", "string"],
            ["month", "month"],
            ["amount", "money"],
        ],
        income: [
            ["location", "string"],
            ["stream", "string"],
            ["month", "month"],
            ["amount", "money"],
        ],
        cash_balances: [
            ["date", "date"],
            ["amount", "money"],
        ],
    },
}

export const PLATFORM_CODES = Object.keys(STREAMS)

export const streamsOf = (platform: string) => Object.keys(STREAMS[platform] ?? {})

/** The fields a stream needs, as the Dashboard streams tab lists them: id first, none of the others required. */
export const streamFields = (platform: string, stream: string): StreamField[] | null => {
    const columns = STREAMS[platform]?.[stream]
    return columns
        ? [{ name: "id", cast: "string", required: true }, ...columns.map(([name, cast]) => ({ name, cast, required: false }))]
        : null
}

export const DEFAULT_SCHEDULE = "0 * * * *"

export const CATALOG: Catalog = {
    connectors: CONNECTORS,
    planned: [],
    platforms: PLATFORM_CODES.map((code) => ({ code, streams: streamsOf(code) })),
    default_schedule: DEFAULT_SCHEDULE,
}
