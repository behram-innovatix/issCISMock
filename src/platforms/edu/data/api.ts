import type { EduDataSource } from "./source"

/**
 * Placeholder for the real integration. Target: "/api/v1/edu/insights/*" on the ISSPHERE gateway, called through
 * @workspace/core-client (Sanctum session cookie + X-ISS-Entity header). Not available yet.
 */
export const eduApiSource: EduDataSource = {
    async load() {
        throw new Error("EDU API data source is not implemented yet. Set NEXT_PUBLIC_DATA_SOURCE=mock.")
    },
}
