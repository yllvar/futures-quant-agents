import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeInitializer } from "@/components/theme-initializer"

export const metadata: Metadata = {
  title: "Trading Dashboard",
  description: "Advanced trading dashboard with AI-powered analysis",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Use the client component instead of calling the hook directly */}
        <ThemeInitializer />
        {children}
      </body>
    </html>
  )
}
