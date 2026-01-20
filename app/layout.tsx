import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import Navigation from "@/components/navigation"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import "./globals.css"

export const metadata: Metadata = {
  title: "无限状态 - 礼物管理系统",
  description: "智能化管理礼物往来，轻松追踪库存状态",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="antialiased">
        <Navigation />
        {children}
        <AIChatAssistant />
        <Analytics />
      </body>
    </html>
  )
}
