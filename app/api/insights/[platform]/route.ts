import type { NextRequest } from "next/server"
import { can } from "@/auth/roles"
import { getSession } from "@/auth/session"
import { cisApi } from "@/lib/cis-api"

/** A platform's dashboard dataset from the CIS API, for signed-in users who may view dashboards. */
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/insights/[platform]">) {
    const user = await getSession()
    if (!user || !can(user.role, "dashboards.view")) return Response.json({ message: "Sign in to view dashboards." }, { status: 401 })

    const { platform } = await params
    if (!/^[a-z]+$/.test(platform)) return Response.json({ message: "Not found." }, { status: 404 })

    return cisApi(`insights/${platform}`)
}
