import type { NextRequest } from "next/server"
import { can } from "@/auth/roles"
import { getSession } from "@/auth/session"
import { cisApi } from "@/lib/cis-api"

/**
 * Server-side proxy from the Connections admin screens to the CIS API (issCisApi). The browser only
 * ever talks to this route with its session cookie; the API token stays on the server. Bodies are
 * passed through as they are (JSON, or multipart for spreadsheet uploads).
 */
const ALLOWED = new RegExp(
    "^(" +
        [
            "connectors",
            "data-sources",
            "data-sources/\\d+",
            "data-sources/\\d+/(test|sync|runs|files|tables|streams)",
            "data-sources/\\d+/files/[a-z_]+",
            "data-sources/\\d+/tables/[^/]+(/preview)?",
            "data-sources/\\d+/streams/[a-z_]+(/preview)?",
        ].join("|") +
        ")$",
)

async function handle(request: NextRequest, { params }: RouteContext<"/api/admin/connections/[...path]">) {
    const user = await getSession()
    if (!user || !can(user.role, "admin.connections.manage")) {
        return Response.json({ message: "You don’t have access to connections." }, { status: 403 })
    }

    const segments = (await params).path
    if (!ALLOWED.test(segments.join("/"))) return Response.json({ message: "Not found." }, { status: 404 })

    // segments arrive decoded; table names may hold dots or spaces, so encode them again
    const path = segments.map(encodeURIComponent).join("/")
    const hasBody = request.method !== "GET" && request.method !== "HEAD"
    return cisApi(`admin/${path}${request.nextUrl.search}`, {
        method: request.method,
        body: hasBody ? await request.arrayBuffer() : undefined,
        contentType: hasBody ? request.headers.get("Content-Type") : null,
    })
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE }
