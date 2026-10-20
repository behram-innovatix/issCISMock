export type DataSourceMode = "mock" | "api"

/**
 * Where the dashboards and Connections read from: "mock" (the default, generated in the browser, used
 * by the Vercel preview) or "api" (the CIS API through this app's /api routes, see src/lib/cis-api.ts).
 */
export const DATA_SOURCE: DataSourceMode = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock"
