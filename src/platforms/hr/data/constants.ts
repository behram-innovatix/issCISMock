export interface Location {
    id: string
    name: string
    short: string
}
/** Staff work at one of the schools or at the group head office. */
export const LOCATIONS: Location[] = [
    { id: "S1", name: "Al Jazeera Academy", short: "Al Jazeera" },
    { id: "S2", name: "Al Maha Academy for Boys", short: "Al Maha Boys" },
    { id: "S3", name: "Al Maha Academy for Girls", short: "Al Maha Girls" },
    { id: "HQ", name: "Group Head Office", short: "Head Office" },
]
export const locationOf = (id: string) => LOCATIONS.find((l) => l.id === id)!

export interface Department {
    code: string
    name: string
    teaching: boolean
}
export const DEPARTMENTS: Department[] = [
    { code: "EY", name: "Early Years", teaching: true },
    { code: "PRI", name: "Primary", teaching: true },
    { code: "ENG", name: "English", teaching: true },
    { code: "MAT", name: "Mathematics", teaching: true },
    { code: "SCI", name: "Science", teaching: true },
    { code: "ARB", name: "Arabic & Islamic Studies", teaching: true },
    { code: "HUM", name: "Humanities", teaching: true },
    { code: "CMP", name: "Computing & Arts", teaching: true },
    { code: "PE", name: "Physical Education", teaching: true },
    { code: "LDR", name: "Leadership", teaching: false },
    { code: "ADM", name: "Administration", teaching: false },
    { code: "FIN", name: "Finance", teaching: false },
    { code: "ITS", name: "IT Services", teaching: false },
    { code: "FAC", name: "Facilities", teaching: false },
    { code: "SSV", name: "Student Services", teaching: false },
    { code: "HRD", name: "Human Resources", teaching: false },
]
export const deptOf = (code: string) => DEPARTMENTS.find((d) => d.code === code)!
/** Departments every secondary section is taught by; primary sections only get ARB and PE specialists. */
export const SECONDARY_SUBJECTS = ["ENG", "MAT", "SCI", "ARB", "HUM", "CMP", "PE"]
export const PRIMARY_SPECIALISTS = ["ARB", "PE"]

export type DayCat = "present" | "late" | "leave" | "absent"
/** Staff day codes (one mark per working day). */
export const HR_CODES: [string, string, DayCat][] = [
    ["P", "Present", "present"],
    ["T", "Training / off-site", "present"],
    ["L", "Late arrival", "late"],
    ["S", "Sick leave", "leave"],
    ["A", "Annual leave", "leave"],
    ["E", "Emergency leave", "leave"],
    ["U", "Unauthorised absence", "absent"],
]
export const HR_CAT: DayCat[] = HR_CODES.map((c) => c[2])
export const DAYCAT_COLOR: Record<DayCat, string> = {
    present: "var(--good)",
    late: "var(--warn)",
    leave: "var(--auth)",
    absent: "var(--bad)",
}
export const DAYCAT_LABEL: Record<DayCat, string> = {
    present: "Present",
    late: "Late",
    leave: "On leave",
    absent: "Unauthorised absence",
}

export const LEAVE_TYPES = ["Annual", "Sick", "Emergency", "Unpaid"] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]
export const LEAVE_COLOR: Record<LeaveType, string> = {
    Annual: "var(--c1)",
    Sick: "var(--c4)",
    Emergency: "var(--c5)",
    Unpaid: "var(--c3)",
}
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]

export const COMPETENCIES = [
    "Core practice",
    "Outcomes & delivery",
    "Professional conduct",
    "Collaboration",
    "Professional growth",
] as const

export const CYCLES = [
    { id: "2024-25", label: "2024–25 Annual" },
    { id: "2025-26", label: "2025–26 Annual" },
    { id: "2026-27-mid", label: "2026–27 Mid-year" },
] as const
export const CURRENT_CYCLE = CYCLES[2]

export type Rating = "Exceeds" | "Meets" | "Developing" | "Unsatisfactory"
export const ratingOf = (s: number): Rating => (s >= 4.25 ? "Exceeds" : s >= 3.5 ? "Meets" : s >= 2.75 ? "Developing" : "Unsatisfactory")
export const RATING_TONE: Record<Rating, "good" | "info" | "warn" | "bad"> = {
    Exceeds: "good",
    Meets: "info",
    Developing: "warn",
    Unsatisfactory: "bad",
}
