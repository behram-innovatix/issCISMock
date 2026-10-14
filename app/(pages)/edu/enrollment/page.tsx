import type { Metadata } from "next"
import { EduEnrollmentScreen } from "@/platforms/edu/features/enrollment/screen"

export const metadata: Metadata = { title: "Enrollment" }

export default function Page() {
    return <EduEnrollmentScreen />
}
