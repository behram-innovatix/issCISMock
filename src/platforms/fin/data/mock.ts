import { getWorld } from "@/mock/world"
import type { FinDataSource } from "./source"

export const finMockSource: FinDataSource = {
    async load() {
        return getWorld().fin
    },
}
