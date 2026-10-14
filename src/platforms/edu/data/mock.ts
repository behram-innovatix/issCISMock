import { getWorld } from "@/mock/world"
import type { EduDataSource } from "./source"

export const eduMockSource: EduDataSource = {
    async load() {
        return getWorld().edu
    },
}
