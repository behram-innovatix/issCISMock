// EDU reference data. The CIS vocabularies (stages, year groups, mark categories) are fixed; the
// schools, register mark codes and behaviour types come from the connected sources with the dataset
// and are applied with applyEduReference() before any screen renders (live bindings).

export type Intake = "Co-educational" | "Boys" | "Girls"
export interface School {
    id: string
    name: string
    short: string
    intake: Intake
}

export let SCHOOLS: School[] = []
export const schoolOf = (id: string): School => SCHOOLS.find((s) => s.id === id) ?? { id, name: id, short: id, intake: "Co-educational" }

export type Stage = "Infant" | "Junior" | "Secondary"
export const STAGES: Stage[] = ["Infant", "Junior", "Secondary"]
/** Canonical year groups; sources map their own codes onto these. */
export const YGS: [string, Stage][] = [
    ["NR", "Infant"],
    ["RE", "Infant"],
    ["01", "Infant"],
    ["02", "Infant"],
    ["03", "Junior"],
    ["04", "Junior"],
    ["05", "Junior"],
    ["06", "Junior"],
    ["07", "Secondary"],
    ["08", "Secondary"],
    ["09", "Secondary"],
    ["10", "Secondary"],
    ["11", "Secondary"],
    ["12", "Secondary"],
    ["13", "Secondary"],
]
export const YG_ORDER: Record<string, number> = Object.fromEntries(YGS.map((y, i) => [y[0], i]))
export const ygName = (y: string) => (y === "NR" ? "Nursery" : y === "RE" ? "Reception" : /^\d+$/.test(y) ? "Year " + +y : y)
export const ygShort = (y: string) => (/^\d+$/.test(y) ? "Y" + +y : y)
/** Section display name: sources may send a full name ("10-JASMINE") or just the letter ("A"). */
export const secName = (yg: string, sec: string) => (sec.length > 1 ? sec : /^\d+$/.test(yg) ? `${+yg}${sec}` : `${yg}-${sec}`)

/** How a register mark counts. "none" (attendance not required, or no mark) is left out of attendance. */
export type MarkCat = "present" | "late" | "auth" | "unauth" | "none"
/** [code, label, category]; index 0 is always "no mark". */
export let CODES: [string, string, MarkCat][] = [["", "No mark", "none"]]
export let CAT: MarkCat[] = ["none"]
export const counts = (c: MarkCat) => c !== "none"
export const CAT_COLOR: Record<MarkCat, string> = {
    present: "var(--good)",
    late: "var(--warn)",
    auth: "var(--auth)",
    unauth: "var(--bad)",
    none: "var(--line-strong)",
}
export const CAT_INK: Record<MarkCat, string> = {
    present: "var(--good-ink)",
    late: "var(--warn-ink)",
    auth: "var(--auth-ink)",
    unauth: "var(--bad-ink)",
    none: "var(--muted)",
}
export const CAT_LABEL: Record<MarkCat, string> = {
    present: "Present",
    late: "Late",
    auth: "Authorised absence",
    unauth: "Unauthorised absence",
    none: "Not required / no mark",
}

export interface BehaviourType {
    n: string
    s: 1 | -1
}
export let BTYPES: BehaviourType[] = []

/** Sessions per week: 5 days × AM/PM. Index = w*SPW + d*2 + (0 AM | 1 PM). */
export const SPW = 10

export interface EduReference {
    schools: School[]
    mark_codes: { code: string; label: string; category: MarkCat }[]
    behaviour_types: BehaviourType[]
}

export function applyEduReference(ref: EduReference) {
    SCHOOLS = ref.schools
    CODES = ref.mark_codes.map((c) => [c.code, c.label, c.category])
    CAT = CODES.map((c) => c[2])
    BTYPES = ref.behaviour_types
}
