import { applyCalendar, type CalendarInput } from "@/lib/calendar"
import { applyEduReference } from "@/platforms/edu/data/constants"
import type { Employee } from "@/platforms/hr/data/types"
import type { FinDataset } from "@/platforms/fin/data/types"
import { generateEdu, type MockEdu } from "./edu/generate"
import { MOCK_REFERENCE } from "./edu/vocab"
import { generateFin } from "./fin/generate"
import { generateHr } from "./hr/generate"

/** Term 1 2026–27: school week Sun–Thu, term starts Sun 23 Aug 2026, data to Thu 8 Oct 2026. */
export const MOCK_CALENDAR: CalendarInput = { start: "2026-08-23", as_of: "2026-10-08", weeks: 7, label: "Term 1 · 2026–27" }

/**
 * The mock "world": EDU is generated first (bit-for-bit the mockup's data), then HR is built
 * around its sections so teachers, classes and behaviour records point at each other, and
 * Finance last (own seed) with fee accounts per student and payroll per employee.
 * Generated once per page load and shared by every platform's mock payload.
 */
let world: { edu: MockEdu; employees: Employee[]; fin: Omit<FinDataset, "meta"> } | null = null

export function getWorld() {
    if (!world) {
        // the generators and the analytics they call read the calendar and reference data, so apply
        // them first, whichever platform's dashboard happens to load first
        applyCalendar(MOCK_CALENDAR)
        applyEduReference(MOCK_REFERENCE)
        const edu = generateEdu()
        const employees = generateHr(edu)
        world = { edu, employees, fin: generateFin(edu, employees) }
    }
    return world
}
