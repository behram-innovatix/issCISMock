import type { FinDataSource } from "./source"

/**
 * Placeholder for the real integration. Target: "/api/v1/finance/insights/*" on the ISSPHERE gateway, called through
 * @workspace/core-client (Sanctum session cookie + X-ISS-Entity header). Not available yet.
 */
export const finApiSource: FinDataSource = {
    async load() {
        throw new Error("Finance API data source is not implemented yet. Set NEXT_PUBLIC_DATA_SOURCE=mock.")
    },
}
