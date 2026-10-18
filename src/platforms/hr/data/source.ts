import { fetchInsights, metaOf } from "@/lib/insights"
import type { HrDataset } from "./types"

/**
 * Loads the HR dashboards' data from the CIS API. Until an HR source (the HRM cis-export API) is
 * connected and synced, the API reports the platform as not connected and the screens say so.
 */
export async function loadHr(): Promise<HrDataset> {
    const payload = await fetchInsights<Partial<HrDataset>>("hr")
    return { employees: payload.connected ? (payload.employees ?? []) : [], meta: metaOf(payload) }
}
