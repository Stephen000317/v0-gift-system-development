"use client"

import Link from "next/link"
import { Gift, Package, BarChart3, ArrowRight, Send, Heart, Sparkles, Calendar } from "lucide-react"
import { useSupabaseStore } from "@/lib/supabase-store"
import { useEffect, useState, useMemo } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const { gifts, inventory, outgoingGifts, fetchGifts, fetchInventory, fetchOutgoingGifts } = useSupabaseStore()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchGifts()
    fetchInventory()
    fetchOutgoingGifts()
  }, [fetchGifts, fetchInventory, fetchOutgoingGifts])

  const nextHoliday = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    const holidays = [
      { name: "春节", date: new Date(year, 0, 1), lunar: true, desc: "农历正月初一" },
      { name: "元宵节", date: new Date(year, 0, 15), lunar: true, desc: "农历正月十五" },
      { name: "清明节", date: new Date(year, 3, 4), lunar: false, desc: "4月4日-6日" },
      { name: "端午节", date: new Date(year, 4, 5), lunar: true, desc: "农历五月初五" },
      { name: "中秋节", date: new Date(year, 8, 15), lunar: true, desc: "农历八月十五" },
      { name: "国庆节", date: new Date(year, 9, 1), lunar: false, desc: "10月1日" },
      { name: "元旦", date: new Date(year, 0, 1), lunar: false, desc: "1月1日" },
    ]

    // 简化版：使用公历日期近似
    const approxHolidays = [
      { name: "春节", date: new Date(year, 1, 10), desc: "农历新年" },
      { name: "清明节", date: new Date(year, 3, 4), desc: "踏青祭祖" },
      { name: "端午节", date: new Date(year, 5, 10), desc: "龙舟竞渡" },
      { name: "中秋节", date: new Date(year, 8, 17), desc: "团圆赏月" },
      { name: "国庆节", date: new Date(year, 9, 1), desc: "举国同庆" },
      { name: "元旦", date: new Date(year + 1, 0, 1), desc: "新年伊始" },
    ]

    for (const holiday of approxHolidays) {
      if (holiday.date > now) {
        const diffTime = holiday.date.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { ...holiday, daysLeft: diffDays }
      }
    }

    const firstHoliday = approxHolidays[0]
    const diffTime = firstHoliday.date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return { ...firstHoliday, daysLeft: diffDays + 365 }
  }, [currentDate])

  const stats = useMemo(() => {
    if (!mounted) return { pendingCount: 0, totalInventory: 0, receivedValue: 0, sentValue: 0, sentCount: 0 }
    const pendingCount = gifts.filter((g) => g.status === "待回礼").length
    const totalInventory = inventory.reduce((sum, item) => sum + item.quantity, 0)
    const receivedValue = gifts.reduce((sum, g) => {
      const value = Number.parseFloat(String(g.estimated_value)) || 0
      return sum + value
    }, 0)
    const sentValue = outgoingGifts.reduce((sum, g) => sum + g.total_cost, 0)
    const sentCount = outgoingGifts.length
    return { pendingCount, totalInventory, receivedValue, sentValue, sentCount }
  }, [gifts, inventory, outgoingGifts, mounted])

  return (
    <div className="min-h-screen bg-background gift-pattern relative overflow-hidden">
      <div className="absolute top-10 left-10 w-48 h-48 opacity-5 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M40 100C40 85 50 75 65 75C65 60 80 50 95 50C110 50 120 60 125 70C135 60 150 55 165 60C180 65 190 80 190 95C190 110 180 120 170 125C180 130 185 140 185 155C185 170 175 180 160 180H60C45 180 35 170 35 155C35 140 40 130 50 125C40 120 40 110 40 100Z"
            fill="currentColor"
            className="text-primary"
          />
        </svg>
      </div>

      <div className="absolute top-40 right-20 w-40 h-40 opacity-5 pointer-events-none rotate-45">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M40 100C40 85 50 75 65 75C65 60 80 50 95 50C110 50 120 60 125 70C135 60 150 55 165 60C180 65 190 80 190 95C190 110 180 120 170 125C180 130 185 140 185 155C185 170 175 180 160 180H60C45 180 35 170 35 155C35 140 40 130 50 125C40 120 40 110 40 100Z"
            fill="currentColor"
            className="text-accent"
          />
        </svg>
      </div>

      <div className="absolute bottom-20 left-1/4 w-32 h-32 opacity-5 pointer-events-none">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
          <text
            x="50"
            y="60"
            fontFamily="serif"
            fontSize="40"
            fontWeight="bold"
            textAnchor="middle"
            fill="currentColor"
            className="text-primary"
          >
            福
          </text>
        </svg>
      </div>

      <section className="pt-24 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-10 right-1/4 w-24 h-24 opacity-10 pointer-events-none animate-float">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="60" height="50" fill="currentColor" className="text-primary" rx="4" />
            <rect x="15" y="25" width="70" height="10" fill="currentColor" className="text-accent" rx="2" />
            <path
              d="M50 10 L50 35 M35 25 L50 10 L65 25"
              stroke="currentColor"
              strokeWidth="3"
              className="text-accent"
            />
          </svg>
        </div>

        <div className="absolute bottom-20 left-1/3 w-20 h-20 opacity-10 pointer-events-none animate-float-delayed">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="60" height="50" fill="currentColor" className="text-primary" rx="4" />
            <rect x="15" y="25" width="70" height="10" fill="currentColor" className="text-accent" rx="2" />
            <circle cx="50" cy="55" r="15" fill="currentColor" className="text-accent/50" />
          </svg>
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20 backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground font-medium">今日</div>
                <div className="text-sm font-bold text-foreground">
                  {currentDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}{" "}
                  {currentDate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border-2 border-accent/30 backdrop-blur-sm shadow-lg shadow-accent/10">
              <Sparkles className="w-5 h-5 text-accent" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground font-medium">{nextHoliday.name}</div>
                <div className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  还有 {nextHoliday.daysLeft} 天 · {nextHoliday.desc}
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent/15 to-primary/15 border border-accent/30 text-foreground text-sm font-semibold mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-accent" />
            智能礼物管理系统
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-foreground mb-6 tracking-tight leading-tight">
            礼尚往来
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              情谊千金
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground mb-12 font-normal max-w-3xl mx-auto leading-relaxed">
            以礼为先，以诚相待，让每一份心意都被珍藏
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/received-gifts"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-xl hover:shadow-primary/30 transition-all font-semibold text-base relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative">开始记录</span>
              <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent/90 to-accent text-accent-foreground rounded-lg hover:shadow-lg hover:shadow-accent/30 transition-all font-semibold text-base border-2 border-accent/50"
            >
              <Sparkles className="w-5 h-5" />
              AI 智能推荐
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                value: stats.pendingCount,
                label: "待回礼",
                color: "from-primary to-primary/80",
                icon: Heart,
                href: "/gift-reply",
              },
              {
                value: stats.totalInventory,
                label: "库存数量",
                color: "from-accent to-accent/80",
                icon: Package,
                href: "/inventory",
              },
              {
                value: `¥${isNaN(stats.receivedValue) ? 0 : stats.receivedValue.toFixed(0)}`,
                label: "收礼总值",
                color: "from-chart-3 to-chart-3/80",
                icon: Gift,
                href: "/received-gifts",
              },
              {
                value: `¥${isNaN(stats.sentValue) ? 0 : stats.sentValue.toFixed(0)}`,
                label: `送礼总值 (${stats.sentCount}份)`,
                color: "from-chart-4 to-chart-4/80",
                icon: Send,
                href: "/outgoing-gifts",
              },
            ].map((stat, idx) => (
              <Link
                key={idx}
                href={stat.href}
                className="relative group bg-card border-2 border-border rounded-xl p-6 hover:shadow-xl hover:border-accent/30 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${stat.color} mb-4 relative z-10 group-hover:scale-110 transition-transform`}
                >
                  <stat.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <p className="text-4xl font-bold text-foreground mb-2 relative z-10 group-hover:text-primary transition-colors">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground font-medium relative z-10 flex items-center gap-1">
                  {stat.label}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block">
              功能特色
            </h2>
            <p className="text-lg text-muted-foreground">专业智能，温情管理</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Gift,
                title: "接收礼物",
                description: "详细记录每份收到的心意，让温暖永存",
                href: "/received-gifts",
                gradient: "from-primary/10 to-primary/5",
                iconBg: "from-primary to-primary/80",
              },
              {
                icon: Send,
                title: "主动送礼",
                description: "追踪赠送记录，维护珍贵的人际关系",
                href: "/outgoing-gifts",
                gradient: "from-chart-3/10 to-chart-3/5",
                iconBg: "from-chart-3 to-chart-3/80",
              },
              {
                icon: Package,
                title: "库存管理",
                description: "智能库存追踪，永不缺少准备",
                href: "/inventory",
                gradient: "from-accent/10 to-accent/5",
                iconBg: "from-accent to-accent/80",
              },
              {
                icon: Heart,
                title: "回礼管理",
                description: "智能管理回礼事项，不错过每一份心意",
                href: "/gift-reply",
                gradient: "from-chart-2/10 to-chart-2/5",
                iconBg: "from-chart-2 to-chart-2/80",
              },
              {
                icon: Sparkles,
                title: "AI 回礼建议",
                description: "人工智能分析，精准推荐最佳方案",
                href: "/recommendations",
                gradient: "from-chart-4/10 to-chart-4/5",
                iconBg: "from-chart-4 to-chart-4/80",
              },
              {
                icon: BarChart3,
                title: "统计分析",
                description: "数据洞察，优化礼物往来策略",
                href: "/dashboard",
                gradient: "from-chart-5/10 to-chart-5/5",
                iconBg: "from-chart-5 to-chart-5/80",
              },
            ].map((feature, idx) => (
              <Link
                key={idx}
                href={feature.href}
                className={`group relative block p-8 rounded-2xl bg-card border-2 border-border hover:border-accent/30 hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div
                  className={`relative inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.iconBg} mb-5 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <h3 className="relative text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="relative text-base text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                <div className="relative inline-flex items-center gap-1 text-primary text-sm font-bold">
                  了解更多
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t-2 border-accent/20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 opacity-20">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M50 10 L50 30 M30 30 L70 30 M30 30 L30 70 M70 30 L70 70 M30 70 L70 70 M50 70 L50 90"
              stroke="currentColor"
              strokeWidth="4"
              className="text-primary"
            />
            <circle cx="50" cy="50" r="15" fill="currentColor" className="text-accent" />
            <circle cx="30" cy="30" r="5" fill="currentColor" className="text-primary" />
            <circle cx="70" cy="30" r="5" fill="currentColor" className="text-primary" />
            <circle cx="30" cy="70" r="5" fill="currentColor" className="text-primary" />
            <circle cx="70" cy="70" r="5" fill="currentColor" className="text-primary" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-2 font-medium">礼尚往来 · 情谊永存</p>
          <p className="text-xs text-muted-foreground/70">© 2025 深圳市无限状态科技有限公司，保留所有权利。</p>
        </div>
      </footer>
    </div>
  )
}
