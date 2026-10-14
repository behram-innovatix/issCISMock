export type DataSourceMode = "mock" | "api"

export const DATA_SOURCE: DataSourceMode = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock"

/** Data is current to the last recorded school day of the mock term. */
export const AS_OF = new Date(2026, 9, 8)
