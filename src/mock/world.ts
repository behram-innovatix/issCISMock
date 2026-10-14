import { generateEdu } from "@/platforms/edu/data/generate"
import type { EduDataset } from "@/platforms/edu/data/types"
import { generateHr } from "@/platforms/hr/data/generate"
import type { HrDataset } from "@/platforms/hr/data/types"

/**
 * The mock "world": EDU is generated first (bit-for-bit the mockup's data), then HR is built
 * around its sections so teachers, classes and behaviour records point at each other.
 * Generated once per page load and shared by both platform data sources.
 */
let world: { edu: EduDataset; hr: HrDataset } | null = null

export function getWorld() {
    if (!world) {
        const edu = generateEdu()
        const employees = generateHr(edu)
        world = { edu, hr: { employees } }
    }
    return world
}
