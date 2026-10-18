import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"
import type { ReactNode } from "react"
import "./globals.css"
import { Providers } from "./providers"

const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sora" })
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" })

export const metadata: Metadata = {
    title: { default: "ISS CIS · Central Intelligence System", template: "%s · ISS CIS" },
    description: "Executive insight across EDU, ERP (HR and Finance) and future platforms.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en-GB" className={`${sora.variable} ${manrope.variable}`}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
