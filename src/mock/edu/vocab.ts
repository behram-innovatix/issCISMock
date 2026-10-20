// Mock-only vocabulary for the generated preview data: the approved mockup's schools, names,
// nationalities, register codes and behaviour types, with the weights the generators draw from.
// The CIS screens never import this; they get the same reference data through applyEduReference().
import type { EduReference, Intake, MarkCat } from "@/platforms/edu/data/constants"

export interface MockSchool {
    id: string
    name: string
    short: string
    intake: Intake
    secs: [number, number]
}

export const SCHOOLS: MockSchool[] = [
    { id: "S1", name: "Al Jazeera Academy", short: "Al Jazeera", intake: "Co-educational", secs: [3, 5] },
    { id: "S2", name: "Al Maha Academy for Boys", short: "Al Maha Boys", intake: "Boys", secs: [2, 3] },
    { id: "S3", name: "Al Maha Academy for Girls", short: "Al Maha Girls", intake: "Girls", secs: [2, 3] },
]

export const HOUSES = ["Falcon", "Oryx", "Pearl", "Dune"]
export const NATS: [string, number][] = [
    ["Qatari", 28],
    ["Egyptian", 12],
    ["Indian", 11],
    ["British", 9],
    ["Jordanian", 8],
    ["Pakistani", 7],
    ["Filipino", 6],
    ["Lebanese", 5],
    ["American", 4],
    ["Other", 10],
]
export const FIRST_M = [
    "Omar",
    "Yusuf",
    "Adam",
    "Khalid",
    "Liam",
    "Noah",
    "Hamad",
    "Ali",
    "Zayd",
    "Ethan",
    "Rayan",
    "Faisal",
    "Ibrahim",
    "Lucas",
    "Samir",
    "Daniel",
    "Tariq",
    "Hassan",
    "Leo",
    "Karim",
    "Jassim",
    "Aryan",
    "Mateo",
    "Bilal",
]
export const FIRST_F = [
    "Mariam",
    "Layla",
    "Noor",
    "Sara",
    "Aisha",
    "Hana",
    "Emma",
    "Lina",
    "Fatima",
    "Zara",
    "Sofia",
    "Reem",
    "Amira",
    "Maya",
    "Dana",
    "Yasmin",
    "Chloe",
    "Huda",
    "Salma",
    "Ava",
    "Jana",
    "Leen",
    "Isla",
    "Rania",
]
export const LAST = [
    "Al-Mansouri",
    "Haddad",
    "Rahman",
    "Khan",
    "Saleh",
    "Nasser",
    "Farouk",
    "Bennett",
    "Carter",
    "Hussein",
    "Qasim",
    "Darwish",
    "Morgan",
    "Al-Kuwari",
    "Siddiqui",
    "Mendes",
    "Park",
    "Osman",
    "Hamdan",
    "Ellis",
    "Aziz",
    "Reyes",
    "Kapoor",
    "Mahmoud",
]
/** Placeholder recorder names from the mockup; consumed for RNG parity, then replaced by real staff ids. */
export const LEGACY_STAFF = ["Ms. Grant", "Mr. Haddad", "Ms. Rahman", "Mr. Ellis", "Ms. Qasim", "Mr. Osman", "Ms. Park", "Mr. Bennett"]

/** [code, label, category]; generator indices are into this list (the CIS list adds "no mark" at 0). */
export const CODES: [string, string, MarkCat][] = [
    ["/", "Present", "present"],
    ["V", "Educational trip", "present"],
    ["P", "Sporting activity", "present"],
    ["L", "Late (before register closes)", "late"],
    ["U", "Late (after register closes)", "late"],
    ["I", "Illness", "auth"],
    ["M", "Medical / dental", "auth"],
    ["R", "Religious observance", "auth"],
    ["C", "Exceptional circumstances", "auth"],
    ["T", "Travel absence", "auth"],
    ["O", "Unauthorised absence", "unauth"],
    ["N", "No reason yet", "unauth"],
    ["G", "Family holiday, not agreed", "unauth"],
    ["?", "Presumed absent", "unauth"],
]

export const CODE_BY_CAT: Record<Exclude<MarkCat, "none">, [number, number][]> = {
    present: [
        [0, 96],
        [1, 2.5],
        [2, 1.5],
    ],
    late: [
        [3, 84],
        [4, 16],
    ],
    auth: [
        [5, 58],
        [6, 22],
        [7, 8],
        [8, 7],
        [9, 5],
    ],
    unauth: [
        [10, 46],
        [11, 30],
        [12, 18],
        [13, 6],
    ],
}

export interface MockBehaviourType {
    n: string
    s: 1 | -1
    min: number
    max: number
    w: number
}
export const BTYPES: MockBehaviourType[] = [
    { n: "Academic excellence", s: 1, min: 2, max: 5, w: 30 },
    { n: "Effort & persistence", s: 1, min: 1, max: 3, w: 28 },
    { n: "Kindness & respect", s: 1, min: 1, max: 4, w: 20 },
    { n: "Leadership", s: 1, min: 3, max: 6, w: 10 },
    { n: "Community contribution", s: 1, min: 2, max: 5, w: 12 },
    { n: "Low-level disruption", s: -1, min: 1, max: 3, w: 34 },
    { n: "Late to lesson", s: -1, min: 1, max: 2, w: 24 },
    { n: "Uniform / equipment", s: -1, min: 1, max: 2, w: 18 },
    { n: "Missing homework", s: -1, min: 1, max: 3, w: 22 },
    { n: "Disrespect to staff", s: -1, min: 4, max: 7, w: 8 },
    { n: "Physical altercation", s: -1, min: 7, max: 10, w: 3 },
]
export const LOCS: [string, number][] = [
    ["Classroom", 46],
    ["Corridor", 17],
    ["Playground", 15],
    ["Canteen", 9],
    ["School bus", 7],
    ["Sports hall", 6],
]

/** The reference data the mock EDU payload carries, in the CIS API's shape. */
export const MOCK_REFERENCE: EduReference = {
    schools: SCHOOLS.map(({ id, name, short, intake }) => ({ id, name, short, intake })),
    mark_codes: [{ code: "", label: "No mark", category: "none" }, ...CODES.map(([code, label, category]) => ({ code, label, category }))],
    behaviour_types: BTYPES.map(({ n, s }) => ({ n, s })),
}
