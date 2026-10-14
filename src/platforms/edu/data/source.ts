import { DATA_SOURCE } from "@/lib/data-source"
import { eduApiSource } from "./api"
import { eduMockSource } from "./mock"
import type { EduDataset } from "./types"

/**
 * Contract between the CIS screens and the EDU platform. Screens only go through hooks that call
 * this interface, so swapping mock data for the real ISSPHERE endpoints is a one-line change.
 */
export interface EduDataSource {
    load(): Promise<EduDataset>
}

export const eduSource: EduDataSource = DATA_SOURCE === "api" ? eduApiSource : eduMockSource
