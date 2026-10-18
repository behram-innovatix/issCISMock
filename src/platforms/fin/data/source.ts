import { DATA_SOURCE } from "@/lib/data-source"
import { finApiSource } from "./api"
import { finMockSource } from "./mock"
import type { FinDataset } from "./types"

/**
 * Contract between the CIS screens and the Finance platform. Screens only go through hooks that call
 * this interface, so swapping mock data for the real ISSPHERE endpoints is a one-line change.
 */
export interface FinDataSource {
    load(): Promise<FinDataset>
}

export const finSource: FinDataSource = DATA_SOURCE === "api" ? finApiSource : finMockSource
