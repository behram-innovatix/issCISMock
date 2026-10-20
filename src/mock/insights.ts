import type { InsightsMeta } from "@/lib/insights"
import { mockSourcesFor } from "./connections/store"
import { MOCK_REFERENCE } from "./edu/vocab"
import { getWorld, MOCK_CALENDAR } from "./world"

const latency = () => new Promise((resolve) => setTimeout(resolve, 250))

/** Freshness as the CIS API reports it, from the mock connections that feed the platform. */
function metaFor(platform: string): InsightsMeta {
    const sources = mockSourcesFor(platform)
    const synced = sources
        .map((s) => s.last_synced_at)
        .filter((at): at is string => !!at)
        .sort()
        .at(-1)
    return { platform, connected: true, synced_at: synced ?? `${MOCK_CALENDAR.as_of}T06:00:00Z`, sources }
}

/**
 * A platform's dashboard dataset in the same shape as /api/insights/{platform} returns it, built from
 * the generated world, so the platform loaders parse mock and real data the same way.
 */
export async function mockInsights<T>(platform: string): Promise<T & InsightsMeta> {
    await latency()
    const { edu, employees, fin } = getWorld()

    const payload =
        platform === "edu"
            ? {
                  calendar: MOCK_CALENDAR,
                  ...MOCK_REFERENCE,
                  sections: edu.sections,
                  staff: employees.map(({ id, name, role }) => ({ id, name, role })),
                  students: edu.students.map(({ s, ev, ...st }) => ({
                      ...st,
                      // chr(48 + mark code index) per session, as the API sends it
                      s: String.fromCharCode(...Array.from(s, (code) => code + 48)),
                      ev: ev.map(({ byStaffId, ...e }) => ({ ...e, by: byStaffId })),
                  })),
              }
            : platform === "hr"
              ? { employees }
              : platform === "fin"
                ? fin
                : null

    if (!payload) return { ...metaFor(platform), connected: false, reason: "Unknown platform." } as unknown as T & InsightsMeta
    return { ...payload, ...metaFor(platform) } as unknown as T & InsightsMeta
}
