import type { Metadata } from "next"
import { StudentProfileScreen } from "@/platforms/edu/features/student-profile/screen"

export const metadata: Metadata = { title: "Student profile" }

export default async function Page({ params }: PageProps<"/edu/students/[id]">) {
    const { id } = await params
    return <StudentProfileScreen id={decodeURIComponent(id)} />
}
