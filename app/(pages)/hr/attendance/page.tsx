import type { Metadata } from "next"
import { HrAttendanceScreen } from "@/platforms/hr/features/attendance/screen"

export const metadata: Metadata = { title: "Attendance & Leave" }

export default function Page() {
    return <HrAttendanceScreen />
}
