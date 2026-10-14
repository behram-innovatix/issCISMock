import type { Metadata } from "next"
import { HrTeacherImpactScreen } from "@/platforms/hr/features/teacher-impact/screen"

export const metadata: Metadata = { title: "Teacher Impact" }

export default function Page() {
    return <HrTeacherImpactScreen />
}
