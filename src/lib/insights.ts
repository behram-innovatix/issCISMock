/** Freshness and connection state that comes with every platform dataset from the CIS API. */
export interface InsightsMeta {
    platform: string
    /** false until a source for the platform has synced data the dashboards can use */
    connected: boolean
    reason?: string
    /** latest successful sync across the platform's sources */
    synced_at: string | null
    sources: { name: string; status: "new" | "healthy" | "degraded" | "failing"; is_active: boolean; last_synced_at: string | null }[]
}

export class InsightsError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message)
    }
}

/** A platform's dashboard dataset, through the CIS web app's server proxy (app/api/insights). */
export async function fetchInsights<T>(platform: string): Promise<T & InsightsMeta> {
    const res = await fetch(`/api/insights/${platform}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new InsightsError(json.message ?? `Couldn’t load ${platform} data (${res.status})`, res.status)
    return json.data
}

export const metaOf = ({ platform, connected, reason, synced_at, sources }: InsightsMeta): InsightsMeta => ({
    platform,
    connected,
    reason,
    synced_at,
    sources,
})
