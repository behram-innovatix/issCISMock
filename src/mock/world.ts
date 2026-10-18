import { generateEdu } from "@/platforms/edu/data/generate"
import type { EduDataset } from "@/platforms/edu/data/types"
import { generateFin } from "@/platforms/fin/data/generate"
import type { FinDataset } from "@/platforms/fin/data/types"
import { generateHr } from "@/platforms/hr/data/generate"
import type { HrDataset } from "@/platforms/hr/data/types"

/**
 * The mock "world": EDU is generated first (bit-for-bit the mockup's data), then HR is built
 * around its sections so teachers, classes and behaviour records point at each other, and
 * Finance last (own seed) with fee accounts per student and payroll per employee.
 * Generated once per page load and shared by every platform data source.
 */
let world: { edu: EduDataset; hr: HrDataset; fin: FinDataset } | null = null

export function getWorld() {
    if (!world) {
        const edu = generateEdu()
        const employees = generateHr(edu)
        world = { edu, hr: { employees }, fin: generateFin(edu, employees) }
    }
    return world
}
