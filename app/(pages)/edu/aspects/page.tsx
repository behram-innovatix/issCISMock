import type { Metadata } from "next"
import { EduAspectsScreen } from "@/platforms/edu/features/aspects/screen"

export const metadata: Metadata = { title: "Aspect Analysis" }

export default function Page() {
    return <EduAspectsScreen />
}
