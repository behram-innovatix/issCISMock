"use client"

import { login, type LoginState } from "@/auth/actions"
import { ROLES } from "@/auth/roles"
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/auth/users"
import { BrandMark } from "@/components/shell/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { PLATFORMS } from "@/platforms/registry"
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Gauge, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import { useActionState, useState } from "react"

const ROLE_ICON = { executive: Gauge, admin: ShieldCheck } as const

export function LoginScreen({ next }: { next?: string }) {
    const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [show, setShow] = useState(false)

    return (
        <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <BrandPanel />

            <main className="flex items-center justify-center px-5 py-10 sm:px-10">
                <div className="animate-rise w-full max-w-[420px]">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <BrandMark />
                        <div>
                            <div className="font-display text-ink text-[15px] leading-tight font-semibold">
                                ISS <span className="text-gradient">CIS</span>
                            </div>
                            <div className="text-muted text-[11px]">Central Intelligence System</div>
                        </div>
                    </div>

                    <div className="eyebrow text-primary/80 mb-1.5">Secure access</div>
                    <h1 className="font-display text-ink text-[28px] leading-tight font-semibold">Sign in to CIS</h1>
                    <p className="text-ink-2 mt-1.5 text-[13.5px]">Use your organisation account to open the executive dashboards.</p>

                    <form action={action} className="mt-7 space-y-4" noValidate>
                        {next && <input type="hidden" name="next" value={next} />}
                        <Input
                            label="Work email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            placeholder="name@organisation.com"
                            icon={<Mail />}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        <Input
                            label="Password"
                            name="password"
                            type={show ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            icon={<Lock />}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            trailing={
                                <button
                                    type="button"
                                    onClick={() => setShow(!show)}
                                    className="text-muted hover:text-ink shrink-0 rounded-md p-1 transition-colors"
                                    aria-label={show ? "Hide password" : "Show password"}
                                >
                                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            }
                        />

                        {state.error && !pending && (
                            <div role="alert" className="animate-fade bg-bad-soft text-bad-ink flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold">
                                <AlertCircle className="mt-px size-4 shrink-0" />
                                {state.error}
                            </div>
                        )}

                        <Button type="submit" variant="primary" disabled={pending} className="h-11 w-full text-[13.5px]">
                            {pending ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" /> Signing in…
                                </>
                            ) : (
                                <>
                                    Sign in <ArrowRight className="size-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-9">
                        <div className="flex items-center gap-3">
                            <span className="bg-line h-px flex-1" />
                            <span className="eyebrow">Demo accounts</span>
                            <span className="bg-line h-px flex-1" />
                        </div>
                        <p className="text-muted mt-2.5 text-center text-[11.5px]">
                            Select a role to fill in its credentials · password <span className="text-ink-2 tabular font-semibold">{DEMO_PASSWORD}</span>
                        </p>
                        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                            {DEMO_ACCOUNTS.map((a) => {
                                const r = ROLES[a.role]
                                const Icon = ROLE_ICON[a.role]
                                const on = email === a.email
                                return (
                                    <button
                                        key={a.email}
                                        type="button"
                                        onClick={() => {
                                            setEmail(a.email)
                                            setPassword(DEMO_PASSWORD)
                                        }}
                                        aria-pressed={on}
                                        className={cn(
                                            "group rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5",
                                            on ? "border-primary/40 bg-primary-soft/60 ring-primary/10 ring-4" : "border-line bg-surface hover:border-line-strong shadow-card",
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="bg-primary-soft text-primary flex size-8 items-center justify-center rounded-lg">
                                                <Icon className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-ink text-[13px] font-semibold">{r.label}</div>
                                                <div className="text-muted truncate text-[11px]">{a.email}</div>
                                            </div>
                                        </div>
                                        <ul className="mt-3 space-y-1">
                                            {r.responsibilities.map((x) => (
                                                <li key={x} className="text-ink-2 flex gap-1.5 text-[11.5px] leading-snug">
                                                    <Check className="text-good mt-0.5 size-3 shrink-0" />
                                                    {x}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function BrandPanel() {
    return (
        <aside className="brand-gradient relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
            {/* soft grid + glow */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-[.12]"
                style={{
                    backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)",
                }}
            />
            <div aria-hidden className="absolute -right-32 -bottom-40 size-[520px] rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
                <span className="rounded-2xl bg-white/15 p-1 ring-1 ring-white/25 backdrop-blur">
                    <BrandMark />
                </span>
                <div>
                    <div className="font-display text-[16px] leading-tight font-semibold text-white">ISS CIS</div>
                    <div className="text-[11.5px] text-white/70">Central Intelligence System</div>
                </div>
            </div>

            <div className="animate-rise relative max-w-[480px]">
                <h2 className="font-display text-[clamp(28px,3vw,40px)] leading-[1.15] font-semibold text-white">
                    One clear view of performance across every platform.
                </h2>
                <p className="mt-4 text-[14px] leading-relaxed text-white/75">
                    Student outcomes, staff performance and — soon — finance, brought together for confident executive decisions.
                </p>

                <ul className="mt-9 space-y-2.5">
                    {PLATFORMS.map((p) => {
                        const Icon = p.icon
                        const live = p.status === "live"
                        return (
                            <li key={p.code} className="flex items-center gap-3 rounded-xl bg-white/10 px-3.5 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-white">
                                    <Icon className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold text-white">{p.name}</div>
                                    <div className="truncate text-[11.5px] text-white/65">{p.description}</div>
                                </div>
                                <span
                                    className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                                        live ? "bg-white text-primary" : "bg-white/15 text-white/80",
                                    )}
                                >
                                    {live ? "Live" : "Soon"}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="relative flex items-center gap-2 text-[11.5px] text-white/60">
                <Lock className="size-3.5" /> Role-based access · sessions expire after 8 hours
            </div>
        </aside>
    )
}
