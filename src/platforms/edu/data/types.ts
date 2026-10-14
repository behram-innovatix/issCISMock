import type { Stage } from "./constants"

export type Gender = "M" | "F"

export interface Section {
    key: string
    school: string
    yg: string
    stage: Stage
    sec: string
    cap: number
    /** HR employee id of the form tutor (homeroom teacher). */
    formTutorId: number
    /** HR employee ids of subject teachers for this section. */
    subjectTeacherIds: number[]
}

export interface BehaviourEvent {
    w: number
    d: number
    /** index into BTYPES */
    t: number
    pts: number
    loc?: string
    /** HR employee id of the staff member who recorded it. */
    byStaffId: number
}

export interface Student {
    id: number
    name: string
    gender: Gender
    school: string
    yg: string
    stage: Stage
    sec: string
    key: string
    house: string
    nat: string
    /** attendance mark-code index per session (NW × SPW) */
    s: Uint8Array
    ev: BehaviourEvent[]
}

export interface EduDataset {
    sections: Section[]
    students: Student[]
}
