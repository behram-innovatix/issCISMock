import type { UserRole } from "./roles"

export type UserStatus = "active" | "invited" | "disabled"

export interface CisUser {
    id: string
    name: string
    email: string
    title: string
    role: UserRole
    status: UserStatus
    /** ISO date of the last sign-in; null for invites that were never accepted. */
    lastActive: string | null
}

/**
 * Seeded CIS directory (mock). When ISSPHERE auth lands this becomes a call to the identity API
 * (@workspace/core-client, Sanctum session cookie) — see src/platforms/edu/data/api.ts.
 */
export const USERS: CisUser[] = [
    { id: "u-ceo", name: "Amina Rahman", email: "ceo@iss.demo", title: "Chief Executive Officer", role: "executive", status: "active", lastActive: "2026-10-08" },
    { id: "u-admin", name: "Daniel Okafor", email: "admin@iss.demo", title: "Systems Administrator", role: "admin", status: "active", lastActive: "2026-10-08" },
    { id: "u-coo", name: "Sarah Whitfield", email: "coo@iss.demo", title: "Chief Operating Officer", role: "executive", status: "active", lastActive: "2026-10-07" },
    { id: "u-edu", name: "Imran Siddiqui", email: "edu.director@iss.demo", title: "Director of Education", role: "executive", status: "active", lastActive: "2026-10-06" },
    { id: "u-hr", name: "Grace Mensah", email: "hr.director@iss.demo", title: "Director of People", role: "executive", status: "active", lastActive: "2026-10-03" },
    { id: "u-cfo", name: "Thomas Byrne", email: "cfo@iss.demo", title: "Chief Financial Officer", role: "executive", status: "invited", lastActive: null },
    { id: "u-it", name: "Leila Haddad", email: "it.ops@iss.demo", title: "IT Operations Lead", role: "admin", status: "active", lastActive: "2026-10-05" },
    { id: "u-old", name: "Mark Ellison", email: "m.ellison@iss.demo", title: "Former Deputy Head", role: "executive", status: "disabled", lastActive: "2026-06-19" },
]

/** Password shared by every seeded account — shown on the login page for the demo. */
export const DEMO_PASSWORD = "Cis@2026"

export const DEMO_ACCOUNTS: { email: string; role: UserRole }[] = [
    { email: "ceo@iss.demo", role: "executive" },
    { email: "admin@iss.demo", role: "admin" },
]
