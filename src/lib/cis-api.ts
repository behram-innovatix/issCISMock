/**
 * Server-side access to the CIS API (Herd/issCisApi). The token never reaches the browser: client
 * code calls this app's /api routes, which check the session and forward with it.
 */
export async function cisApi(path: string, init: { method?: string; body?: BodyInit; contentType?: string | null } = {}) {
    const base = process.env.CIS_API_URL
    const token = process.env.CIS_API_TOKEN
    if (!base || !token) {
        return Response.json(
            { message: "The CIS API isn’t configured. Set CIS_API_URL and CIS_API_TOKEN in .env.local (token: php artisan cis:token)." },
            { status: 503 },
        )
    }

    try {
        const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/${path}`, {
            method: init.method ?? "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                ...(init.contentType && { "Content-Type": init.contentType }),
            },
            body: init.body,
            cache: "no-store",
        })
        if (res.status === 401 || res.status === 403) {
            return Response.json(
                { message: "The CIS API rejected the server token. Issue a new one with php artisan cis:token." },
                { status: 502 },
            )
        }
        return new Response(res.status === 204 ? null : res.body, {
            status: res.status,
            headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
        })
    } catch {
        return Response.json({ message: `Can’t reach the CIS API at ${base}. Is it running?` }, { status: 502 })
    }
}
