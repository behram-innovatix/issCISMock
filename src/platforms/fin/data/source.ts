import { fetchInsights, metaOf } from "@/lib/insights"
import type { FinDataset } from "./types"

/**
 * Loads the Finance dashboards' data from the CIS API. Until a Finance source is connected and
 * synced, the API reports the platform as not connected and the screens say so.
 */
export async function loadFin(): Promise<FinDataset> {
    const payload = await fetchInsights<Partial<FinDataset>>("fin")
    const empty = { accounts: [], payroll: [], budget: [], income: [], openingCash: 0 }
    return { ...empty, ...(payload.connected ? payload : {}), meta: metaOf(payload) }
}
