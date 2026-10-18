import type { InsightsMeta } from "@/lib/insights"
import type { Stage } from "./constants"

export type Gender = "M" | "F"

export interface Section {
    key: string
    school: string
    yg: string
    stage: Stage
    sec: string
    /** seats in the section; null when the source doesn't record capacity */
    cap: number | null
    /** staff id of the form tutor (homeroom teacher) */
    formTutorId: string | null
    /** staff ids of subject teachers for this section */
    subjectTeacherIds: string[]
}

export interface BehaviourEvent {
    w: number
    d: number
    /** index into BTYPES */
    t: number
    pts: number
    loc?: string | null
    /** staff id of the person who recorded it */
    byStaffId: string | null
}

export interface Student {
    id: string
    name: string
    gender: Gender
    school: string
    yg: string
    stage: Stage
    sec: string
    key: string
    house: string | null
    nat: string | null
    /** attendance mark-code index per session (NW × SPW) */
    s: Uint8Array
    ev: BehaviourEvent[]
}

export interface StaffMember {
    id: string
    name: string
    role: string | null
}

export interface EduDataset {
    sections: Section[]
    students: Student[]
    staff: StaffMember[]
    meta: InsightsMeta
}
