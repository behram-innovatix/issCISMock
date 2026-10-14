import { getWorld } from "@/mock/world"
import type { HrDataSource } from "./source"

export const hrMockSource: HrDataSource = {
    async load() {
        return getWorld().hr
    },
}
