import type { Metadata } from "next"
import { EduStudentsScreen } from "@/platforms/edu/features/students/screen"

export const metadata: Metadata = { title: "Students" }

export default function Page() {
    return <EduStudentsScreen />
}
