"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Gift, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()

    try {
      await supabase.auth.signOut()
      window.location.replace("/auth/login")
    } catch (error) {
      console.error("[v0] 退出登录失败:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <nav
      className={`bg-card/95 backdrop-blur-md border-b-2 border-accent/20 sticky top-0 z-50 shadow-sm transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative gold-shimmer">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg blur-sm" />
              <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
              </div>
              <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              礼尚往来
            </span>
          </Link>

          <div className="flex gap-2 items-center">
            {[
              { href: "/received-gifts", label: "接收礼物" },
              { href: "/outgoing-gifts", label: "主动送礼" },
              { href: "/gift-reply", label: "回礼管理" },
              { href: "/inventory", label: "库存管理" },
              { href: "/recommendations", label: "回礼建议" },
              { href: "/dashboard", label: "统计分析" },
              { href: "/contacts", label: "联系人" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 pointer-events-none" />
                )}
              </Link>
            ))}

            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              size="sm"
              className="ml-2 text-sm border-[#D4AF37] hover:bg-gradient-to-r hover:from-[#B8323F] hover:to-[#8B0000] hover:text-white transition-all bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-1" />
              {isLoggingOut ? "退出中..." : "退出"}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
