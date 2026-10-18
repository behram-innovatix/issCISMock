import {
    ArrowLeftRight,
    Boxes,
    Award,
    CalendarCheck,
    CalendarClock,
    ChartColumn,
    GraduationCap,
    IdCard,
    Landmark,
    LayoutDashboard,
    Link2,
    type LucideIcon,
    PiggyBank,
    Receipt,
    TrendingUp,
    UserPlus,
    Users,
    Wallet,
} from "lucide-react"

export interface NavItem {
    href: string
    label: string
    icon: LucideIcon
}

export interface PlatformDefinition {
    code: string
    name: string
    description: string
    icon: LucideIcon
    basePath: string
    status: "live" | "coming-soon"
    /** accent used for the platform's icon tile */
    accent: string
    nav: NavItem[]
}

/**
 * Every platform connected to the CIS. The sidebar, the Executive Overview and the breadcrumbs
 * are all generated from this list. To connect a new platform: add src/platforms/<code>/
 * (data source + screens), add its routes under app/(pages)/<code>/, and register it here.
 */
export const PLATFORMS: PlatformDefinition[] = [
    {
        code: "edu",
        name: "EDU",
        description: "Enrolment, attendance and behaviour across all schools",
        icon: GraduationCap,
        basePath: "/edu",
        status: "live",
        accent: "var(--c1)",
        nav: [
            { href: "/edu", label: "Overview", icon: LayoutDashboard },
            { href: "/edu/enrollment", label: "Enrollment", icon: UserPlus },
            { href: "/edu/attendance", label: "Attendance", icon: CalendarCheck },
            { href: "/edu/behaviour", label: "Behaviour", icon: Award },
            { href: "/edu/aspects", label: "Aspect Analysis", icon: ChartColumn },
            { href: "/edu/students", label: "Students", icon: Users },
        ],
    },
    {
        code: "hr",
        name: "HR",
        description: "Staff attendance, leave, appraisals and teacher impact",
        icon: IdCard,
        basePath: "/hr",
        status: "live",
        accent: "var(--c2)",
        nav: [
            { href: "/hr", label: "Overview", icon: LayoutDashboard },
            { href: "/hr/attendance", label: "Attendance & Leave", icon: CalendarClock },
            { href: "/hr/performance", label: "Performance", icon: TrendingUp },
            { href: "/hr/teacher-impact", label: "Teacher Impact", icon: Link2 },
            { href: "/hr/staff", label: "Staff", icon: Users },
        ],
    },
    {
        code: "fin",
        name: "Finance",
        description: "Fees, budget, payroll and cash flow",
        icon: Landmark,
        basePath: "/fin",
        status: "live",
        accent: "var(--c3)",
        nav: [
            { href: "/fin", label: "Overview", icon: LayoutDashboard },
            { href: "/fin/fees", label: "Fees & Collections", icon: Receipt },
            { href: "/fin/budget", label: "Budget vs Actual", icon: PiggyBank },
            { href: "/fin/payroll", label: "Payroll", icon: Wallet },
            { href: "/fin/cash-flow", label: "Cash Flow", icon: ArrowLeftRight },
            { href: "/fin/accounts", label: "Fee Accounts", icon: Users },
        ],
    },
]

export const platformForPath = (path: string) => PLATFORMS.find((p) => path === p.basePath || path.startsWith(p.basePath + "/"))

export interface SuiteDefinition {
    code: string
    name: string
    description: string
    icon: LucideIcon
    accent: string
    /** platform codes, in sidebar order */
    platforms: string[]
}

/**
 * How platforms are grouped in the sidebar and breadcrumbs. A suite with one platform shows as that
 * platform; a suite with several (ERP) shows one entry with a sub-heading per platform.
 */
export const SUITES: SuiteDefinition[] = [
    { code: "edu", name: "EDU", description: "Students and schools", icon: GraduationCap, accent: "var(--c1)", platforms: ["edu"] },
    { code: "erp", name: "ERP", description: "HR and Finance", icon: Boxes, accent: "var(--c2)", platforms: ["hr", "fin"] },
]

export const platformsOf = (suite: SuiteDefinition) => suite.platforms.map((code) => PLATFORMS.find((p) => p.code === code)!)

export const suiteOf = (platform: PlatformDefinition) => SUITES.find((s) => s.platforms.includes(platform.code))
