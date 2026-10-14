import type { Metadata } from "next"
import { EduBehaviourScreen } from "@/platforms/edu/features/behaviour/screen"

export const metadata: Metadata = { title: "Behaviour" }

export default function Page() {
    return <EduBehaviourScreen />
}
