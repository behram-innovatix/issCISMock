/**
 * CIS access roles — the single source of truth for what each role is responsible for
 * and which permissions it holds. Named `UserRole` to stay clear of the HR job-role filter.
 */
export type UserRole = "executive" | "admin"

export type Permission = "dashboards.view" | "admin.users.manage" | "admin.roles.view"

export interface RoleDefinition {
    code: UserRole
    label: string
    audience: string
    description: string
    responsibilities: string[]
    permissions: Permission[]
}

export const PERMISSIONS: { code: Permission; label: string; description: string }[] = [
    { code: "dashboards.view", label: "View dashboards", description: "Executive Overview and every live platform (EDU, HR, Finance)" },
    { code: "admin.users.manage", label: "Manage users", description: "Invite, deactivate and change the role of CIS users" },
    { code: "admin.roles.view", label: "View roles & permissions", description: "Review what each role can access" },
]

export const ROLES: Record<UserRole, RoleDefinition> = {
    executive: {
        code: "executive",
        label: "Executive",
        audience: "CEO · Directors",
        description: "Monitors organisation performance across every connected platform and acts on the insights.",
        responsibilities: [
            "Review the Executive Overview and platform KPIs",
            "Drill into student and staff performance",
            "Identify risks and direct follow-up actions",
        ],
        permissions: ["dashboards.view"],
    },
    admin: {
        code: "admin",
        label: "Administrator",
        audience: "System administrators",
        description: "Runs the CIS — controls who can sign in and what each role is allowed to see.",
        responsibilities: [
            "Invite, deactivate and re-assign CIS users",
            "Maintain roles and platform access",
            "Full read access to every dashboard",
        ],
        permissions: ["dashboards.view", "admin.users.manage", "admin.roles.view"],
    },
}

export const ROLE_LIST = Object.values(ROLES)

export const isUserRole = (v: unknown): v is UserRole => v === "executive" || v === "admin"

export const can = (role: UserRole, permission: Permission) => ROLES[role].permissions.includes(permission)

/** The signed-in user as exposed to client components. */
export interface SessionUser {
    id: string
    name: string
    email: string
    title: string
    role: UserRole
}
