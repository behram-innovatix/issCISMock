import { DATA_SOURCE } from "@/lib/data-source"
import { hrApiSource } from "./api"
import { hrMockSource } from "./mock"
import type { HrDataset } from "./types"

/**
 * Contract between the CIS screens and the HR platform. Screens only go through hooks that call
 * this interface, so swapping mock data for the real ISSPHERE endpoints is a one-line change.
 */
export interface HrDataSource {
    load(): Promise<HrDataset>
}

export const hrSource: HrDataSource = DATA_SOURCE === "api" ? hrApiSource : hrMockSource
