import type { Metadata } from "next"
import { EduAttendanceScreen } from "@/platforms/edu/features/attendance/screen"

export const metadata: Metadata = { title: "Attendance" }

export default function Page() {
    return <EduAttendanceScreen />
}
