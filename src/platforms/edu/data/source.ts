import { applyCalendar, type CalendarInput } from "@/lib/calendar"
import { fetchInsights, metaOf } from "@/lib/insights"
import { applyEduReference, type EduReference } from "./constants"
import type { BehaviourEvent, EduDataset, Section, StaffMember, Student } from "./types"

/** The EDU dataset as the CIS API sends it: attendance is one character per session. */
interface EduPayload extends Partial<EduReference> {
    calendar?: CalendarInput
    sections?: Section[]
    staff?: StaffMember[]
    students?: (Omit<Student, "s" | "ev"> & {
        s: string
        ev: (Omit<BehaviourEvent, "byStaffId"> & { by: string | null })[]
    })[]
}

/**
 * Loads the EDU dashboards' data from the CIS API (issCisApi), built from the synced sources, and
 * applies the reporting calendar and reference data (schools, mark codes, behaviour types) first.
 */
export async function loadEdu(): Promise<EduDataset> {
    const payload = await fetchInsights<EduPayload>("edu")
    const meta = metaOf(payload)

    if (!payload.connected || !payload.calendar) return { sections: [], students: [], staff: [], meta }

    applyCalendar(payload.calendar)
    applyEduReference({
        schools: payload.schools ?? [],
        mark_codes: payload.mark_codes ?? [],
        behaviour_types: payload.behaviour_types ?? [],
    })

    return {
        meta,
        sections: payload.sections ?? [],
        staff: payload.staff ?? [],
        students: (payload.students ?? []).map((st) => ({
            ...st,
            // chr(48 + mark code index) per session
            s: Uint8Array.from(st.s, (ch) => ch.charCodeAt(0) - 48),
            ev: st.ev.map(({ by, ...e }) => ({ ...e, byStaffId: by })),
        })),
    }
}
