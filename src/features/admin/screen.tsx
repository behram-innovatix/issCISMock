"use client"

import { PERMISSIONS, ROLE_LIST, ROLES, type UserRole } from "@/auth/roles"
import { USERS, type CisUser, type UserStatus } from "@/auth/users"
import { Kpi, KpiGrid } from "@/components/insights/kpi"
import { SearchInput } from "@/components/insights/search-input"
import { PageHeader } from "@/components/shell/page-header"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, Grid, Note, Panel } from "@/components/ui/panel"
import { Pill } from "@/components/ui/pill"
import { Segmented } from "@/components/ui/segmented"
import type { PillTone } from "@/lib/status"
import { Check, Gauge, Mail, Minus, ShieldCheck, UserCheck, UserPlus, Users, X } from "lucide-react"
import { useState } from "react"

const STATUS: Record<UserStatus, { label: string; tone: PillTone }> = {
    active: { label: "Active", tone: "good" },
    invited: { label: "Invited", tone: "info" },
    disabled: { label: "Deactivated", tone: "neutral" },
}

const ROLE_ICON = { executive: Gauge, admin: ShieldCheck } as const
const ROLE_OPTIONS = ROLE_LIST.map((r) => ({ value: r.code, label: r.label }))

const lastActive = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never signed in"

export function AdminScreen({ currentUserId }: { currentUserId: string }) {
    const [tab, setTab] = useState<"users" | "roles">("users")
    const [users, setUsers] = useState<CisUser[]>(USERS)
    const [inviting, setInviting] = useState(false)

    const update = (id: string, patch: Partial<CisUser>) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)))

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Users & Roles"
                description="Control who can sign in to the CIS and what each role is responsible for."
                actions={
                    <>
                        <Segmented
                            label="Section"
                            value={tab}
                            onChange={setTab}
                            options={[
                                { value: "users", label: "Users" },
                                { value: "roles", label: "Roles & permissions" },
                            ]}
                        />
                        {tab === "users" && (
                            <Button variant="primary" onClick={() => setInviting(true)}>
                                <UserPlus className="size-4" /> Invite user
                            </Button>
                        )}
                    </>
                }
            />
            {tab === "users" ? <UsersTab users={users} currentUserId={currentUserId} onUpdate={update} /> : <RolesTab users={users} />}
            {inviting && (
                <InviteDialog
                    existing={users}
                    onClose={() => setInviting(false)}
                    onInvite={(u) => {
                        setUsers((us) => [u, ...us])
                        setInviting(false)
                        setTab("users")
                    }}
                />
            )}
        </>
    )
}

function UsersTab({
    users,
    currentUserId,
    onUpdate,
}: {
    users: CisUser[]
    currentUserId: string
    onUpdate: (id: string, patch: Partial<CisUser>) => void
}) {
    const [q, setQ] = useState("")
    const needle = q.trim().toLowerCase()
    const rows = needle ? users.filter((u) => `${u.name} ${u.email} ${u.title}`.toLowerCase().includes(needle)) : users
    const count = (f: (u: CisUser) => boolean) => users.filter(f).length

    return (
        <div className="space-y-4">
            <KpiGrid>
                <Kpi
                    label="Total users"
                    value={users.length}
                    icon={<Users />}
                    foot={`${count((u) => u.status === "invited")} pending invites`}
                />
                <Kpi
                    label="Active"
                    value={count((u) => u.status === "active")}
                    icon={<UserCheck />}
                    color="var(--good)"
                    foot={`${count((u) => u.status === "disabled")} deactivated`}
                />
                <Kpi
                    label="Executives"
                    value={count((u) => u.role === "executive")}
                    icon={<Gauge />}
                    color="var(--c2)"
                    foot="Dashboard access"
                />
                <Kpi
                    label="Administrators"
                    value={count((u) => u.role === "admin")}
                    icon={<ShieldCheck />}
                    color="var(--c3)"
                    foot="Full system access"
                />
            </KpiGrid>

            <Panel
                title="Directory"
                subtitle="Role and status changes apply to this session only (mock data)."
                action={<SearchInput value={q} onChange={setQ} placeholder="Search users" />}
                bodyClassName="-mx-5 -mb-5"
            >
                {rows.length === 0 ? (
                    <div className="px-5 pb-5">
                        <Empty>No users match “{q}”.</Empty>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-[12.5px]">
                            <thead>
                                <tr className="border-line text-muted border-y text-left text-[11px] font-semibold tracking-wide uppercase">
                                    <th className="px-5 py-2.5">User</th>
                                    <th className="px-3 py-2.5">Role</th>
                                    <th className="px-3 py-2.5">Status</th>
                                    <th className="px-3 py-2.5">Last active</th>
                                    <th className="px-5 py-2.5 text-right">Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((u, i) => {
                                    const self = u.id === currentUserId
                                    return (
                                        <tr key={u.id} className="border-line hover:bg-bg/60 border-b transition-colors last:border-b-0">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={u.name} seed={i} />
                                                    <div className="min-w-0">
                                                        <div className="text-ink flex items-center gap-2 font-semibold">
                                                            {u.name}
                                                            {self && <Pill tone="info">You</Pill>}
                                                        </div>
                                                        <div className="text-muted truncate text-[11.5px]">
                                                            {u.title} · {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                {self ? (
                                                    <Pill tone="info">{ROLES[u.role].label}</Pill>
                                                ) : (
                                                    <Segmented
                                                        size="sm"
                                                        label={`Role for ${u.name}`}
                                                        value={u.role}
                                                        options={ROLE_OPTIONS}
                                                        onChange={(role: UserRole) => onUpdate(u.id, { role })}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <Pill tone={STATUS[u.status].tone} dot>
                                                    {STATUS[u.status].label}
                                                </Pill>
                                            </td>
                                            <td className="text-ink-2 tabular px-3 py-3">{lastActive(u.lastActive)}</td>
                                            <td className="px-5 py-3 text-right">
                                                {self ? (
                                                    <span className="text-muted text-[11.5px]">—</span>
                                                ) : u.status === "disabled" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="soft"
                                                        onClick={() => onUpdate(u.id, { status: u.lastActive ? "active" : "invited" })}
                                                    >
                                                        Reactivate
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => onUpdate(u.id, { status: "disabled" })}>
                                                        Deactivate
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    )
}

function RolesTab({ users }: { users: CisUser[] }) {
    return (
        <Grid>
            {ROLE_LIST.map((r) => {
                const Icon = ROLE_ICON[r.code]
                const members = users.filter((u) => u.role === r.code && u.status !== "disabled").length
                return (
                    <Panel key={r.code} span={6}>
                        <div className="flex items-start gap-3.5">
                            <span className="bg-primary-soft text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                <Icon className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-display text-ink text-[17px] font-semibold">{r.label}</h3>
                                    <Pill>{r.audience}</Pill>
                                    <Pill tone="info">
                                        {members} {members === 1 ? "member" : "members"}
                                    </Pill>
                                </div>
                                <p className="text-ink-2 mt-1 text-[13px]">{r.description}</p>
                            </div>
                        </div>
                        <div className="eyebrow mt-5 mb-2">Responsibilities</div>
                        <ul className="space-y-1.5">
                            {r.responsibilities.map((x) => (
                                <li key={x} className="text-ink-2 flex gap-2 text-[13px]">
                                    <Check className="text-good mt-0.5 size-4 shrink-0" />
                                    {x}
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )
            })}

            <Panel title="Permission matrix" subtitle="What each role is allowed to do in the CIS">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[12.5px]">
                        <thead>
                            <tr className="border-line text-muted border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                                <th className="py-2.5 pr-3">Permission</th>
                                {ROLE_LIST.map((r) => (
                                    <th key={r.code} className="w-36 px-3 py-2.5 text-center">
                                        {r.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PERMISSIONS.map((p) => (
                                <tr key={p.code} className="border-line border-b last:border-b-0">
                                    <td className="py-3 pr-3">
                                        <div className="text-ink font-semibold">{p.label}</div>
                                        <div className="text-muted text-[11.5px]">{p.description}</div>
                                    </td>
                                    {ROLE_LIST.map((r) => (
                                        <td key={r.code} className="px-3 py-3 text-center">
                                            {r.permissions.includes(p.code) ? (
                                                <span className="bg-good-soft text-good-ink inline-flex size-6 items-center justify-center rounded-full">
                                                    <Check className="size-3.5" aria-label="Allowed" />
                                                </span>
                                            ) : (
                                                <span className="bg-bg-2 text-muted inline-flex size-6 items-center justify-center rounded-full">
                                                    <Minus className="size-3.5" aria-label="Not allowed" />
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Note className="mt-3">Roles are defined centrally; new platforms inherit dashboard access automatically.</Note>
            </Panel>
        </Grid>
    )
}

function InviteDialog({ existing, onClose, onInvite }: { existing: CisUser[]; onClose: () => void; onInvite: (u: CisUser) => void }) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [title, setTitle] = useState("")
    const [role, setRole] = useState<UserRole>("executive")
    const [error, setError] = useState("")

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const mail = email.trim().toLowerCase()
        if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError("Enter a name and a valid email address.")
        if (existing.some((u) => u.email === mail)) return setError("A user with this email already exists.")
        onInvite({
            id: `u-${Date.now()}`,
            name: name.trim(),
            email: mail,
            title: title.trim() || ROLES[role].label,
            role,
            status: "invited",
            lastActive: null,
        })
    }

    return (
        <div
            className="animate-fade bg-ink/25 fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="invite-title"
                className="animate-rise border-line bg-surface shadow-pop w-full max-w-[440px] rounded-2xl border p-6"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 id="invite-title" className="font-display text-ink text-[18px] font-semibold">
                            Invite a user
                        </h2>
                        <p className="text-muted mt-0.5 text-[12.5px]">They’ll receive an email to set up their CIS access.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted hover:bg-bg-2 hover:text-ink rounded-lg p-1.5"
                        aria-label="Close"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <div className="mt-5 space-y-3.5">
                    <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    <Input label="Work email" type="email" icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Input label="Job title" placeholder="Optional" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <div>
                        <div className="text-ink-2 mb-1.5 text-[12px] font-semibold">Role</div>
                        <Segmented label="Role" value={role} options={ROLE_OPTIONS} onChange={setRole} />
                        <p className="text-muted mt-1.5 text-[11.5px]">{ROLES[role].description}</p>
                    </div>
                    {error && <p className="bg-bad-soft text-bad-ink rounded-xl px-3 py-2 text-[12px] font-semibold">{error}</p>}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">
                        <UserPlus className="size-4" /> Send invite
                    </Button>
                </div>
            </form>
        </div>
    )
}
