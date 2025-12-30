"use client"

import { useMemo, useState, useEffect } from "react"
import { Users, TrendingUp, Gift, BarChart3, Send, Calendar, DollarSign, TrendingDown } from "lucide-react"
import { useSupabaseStore } from "@/lib/supabase-store"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, Area, ComposedChart } from "recharts"

export default function Dashboard() {
  const { gifts, inventory, outgoingGifts, fetchGifts, fetchInventory, fetchOutgoingGifts } = useSupabaseStore()
  const [mounted, setMounted] = useState(false)
  const [timeRange, setTimeRange] = useState<"30" | "90" | "365" | "all">("365")

  useEffect(() => {
    setMounted(true)
    fetchGifts()
    fetchInventory()
    fetchOutgoingGifts()
  }, [fetchGifts, fetchInventory, fetchOutgoingGifts])

  const stats = useMemo(() => {
    const now = new Date()
    const daysBefore = timeRange === "all" ? Number.POSITIVE_INFINITY : Number.parseInt(timeRange)
    const cutoffDate = new Date(now.getTime() - daysBefore * 24 * 60 * 60 * 1000)

    const filteredGifts = gifts.filter((g) => {
      const giftDate = new Date(g.received_date)
      return timeRange === "all" || giftDate >= cutoffDate
    })

    const filteredOutgoing = outgoingGifts.filter((g) => {
      const sendDate = new Date(g.send_date)
      return timeRange === "all" || sendDate >= cutoffDate
    })

    const receivedValue = filteredGifts.reduce((sum, g) => {
      const value = Number.parseFloat(String(g.estimated_value)) || 0
      return sum + value
    }, 0)
    const repliedCount = filteredGifts.filter((g) => g.status === "已回礼").length
    const pendingCount = filteredGifts.filter((g) => g.status === "待回礼").length
    const inventoryValue = inventory.reduce((sum, i) => sum + i.quantity * i.price, 0)

    const monthlyTrend = (() => {
      console.log(
        "[v0] 计算月度趋势 - filteredGifts:",
        filteredGifts.map((g) => ({
          id: g.id,
          received_date: g.received_date,
          from_person: g.from_person,
          estimated_value: g.estimated_value,
        })),
      )
      console.log(
        "[v0] 计算月度趋势 - filteredOutgoing:",
        filteredOutgoing.map((g) => ({
          id: g.id,
          send_date: g.send_date,
          to_person: g.to_person,
          total_cost: g.total_cost,
        })),
      )

      const monthMap: Record<string, { received: number; sent: number; receivedCount: number; sentCount: number }> = {}

      filteredGifts.forEach((g) => {
        const month = new Date(g.received_date).toLocaleDateString("zh-CN", { year: "numeric", month: "short" })
        console.log("[v0] 收礼记录分组:", {
          gift_id: g.id,
          from_person: g.from_person,
          received_date: g.received_date,
          month,
        })
        if (!monthMap[month]) monthMap[month] = { received: 0, sent: 0, receivedCount: 0, sentCount: 0 }
        monthMap[month].received += Number.parseFloat(String(g.estimated_value)) || 0
        monthMap[month].receivedCount += 1
      })

      filteredOutgoing.forEach((g) => {
        const month = new Date(g.send_date).toLocaleDateString("zh-CN", { year: "numeric", month: "short" })
        console.log("[v0] 送礼记录分组:", { gift_id: g.id, to_person: g.to_person, send_date: g.send_date, month })
        if (!monthMap[month]) monthMap[month] = { received: 0, sent: 0, receivedCount: 0, sentCount: 0 }
        monthMap[month].sent += g.total_cost
        monthMap[month].sentCount += 1
      })

      console.log("[v0] 月度统计汇总:", monthMap)

      return Object.entries(monthMap)
        .sort(([a], [b]) => {
          const dateA = new Date(a)
          const dateB = new Date(b)
          return dateA.getTime() - dateB.getTime()
        })
        .slice(-12)
        .map(([month, data]) => ({
          month,
          收到: data.received,
          送出: data.sent,
          净收入: data.received - data.sent,
          收礼数: data.receivedCount,
          送礼数: data.sentCount,
        }))
    })()

    const costAnalysis = {
      totalReceived: receivedValue,
      totalSent: filteredOutgoing.reduce((sum, g) => sum + g.total_cost, 0),
      netBalance: receivedValue - filteredOutgoing.reduce((sum, g) => sum + g.total_cost, 0),
      avgReceivedValue: receivedValue / (filteredGifts.length || 1),
      avgSentValue: filteredOutgoing.reduce((sum, g) => sum + g.total_cost, 0) / (filteredOutgoing.length || 1),
      replyRate: repliedCount / (filteredGifts.length || 1),
      inventoryValue,
      roi: (() => {
        const totalSentCost = filteredOutgoing.reduce((sum, g) => sum + g.total_cost, 0)
        // 如果送出成本为0或小于100元，认为数据不足
        if (totalSentCost === 0 || totalSentCost < 100) {
          return null // 返回null表示数据不足
        }
        return (receivedValue / totalSentCost - 1) * 100
      })(),
    }

    const personAnalysis = (() => {
      const personMap: Record<string, { received: number; sent: number; balance: number }> = {}

      filteredGifts.forEach((g) => {
        const person = g.from_person
        if (!personMap[person]) personMap[person] = { received: 0, sent: 0, balance: 0 }
        personMap[person].received += Number.parseFloat(String(g.estimated_value)) || 0
      })

      filteredOutgoing.forEach((g) => {
        const person = g.to_person
        if (!personMap[person]) personMap[person] = { received: 0, sent: 0, balance: 0 }
        personMap[person].sent += g.total_cost
      })

      Object.keys(personMap).forEach((person) => {
        personMap[person].balance = personMap[person].received - personMap[person].sent
      })

      return Object.entries(personMap)
        .map(([name, data]) => ({
          name,
          ...data,
        }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        .slice(0, 10)
    })()

    const bySource = filteredGifts.reduce(
      (acc, g) => {
        acc[g.from_person] = (acc[g.from_person] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const byCategory = filteredGifts.reduce(
      (acc, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const categoryChartData = Object.entries(byCategory).map(([category, count]) => {
      return {
        name: category,
        value: count,
      }
    })

    const topSources = Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        礼物数量: count,
      }))

    const valueByCategory = filteredGifts.reduce(
      (acc, g) => {
        const value = Number.parseFloat(String(g.estimated_value)) || 0
        acc[g.category] = (acc[g.category] || 0) + value
        return acc
      },
      {} as Record<string, number>,
    )

    const valueChartData = Object.entries(valueByCategory).map(([name, value]) => ({
      name,
      总价值: value,
    }))

    const sentValue = filteredOutgoing.reduce((sum, g) => sum + g.total_cost, 0)
    const sentCount = filteredOutgoing.length

    return {
      receivedValue,
      sentValue,
      sentCount,
      totalGifts: filteredGifts.length,
      repliedCount,
      pendingCount,
      bySource: Object.entries(bySource),
      byCategory: Object.entries(byCategory),
      categoryChartData,
      topSources,
      valueChartData,
      monthlyTrend,
      costAnalysis,
      personAnalysis,
    }
  }, [gifts, inventory, outgoingGifts, timeRange])

  if (!mounted) {
    return <div className="min-h-screen bg-[#FAF7F0]" />
  }

  const COLORS = ["#007AFF", "#5856D6", "#FF2D55", "#FF9500", "#34C759"]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl p-4">
          <p className="text-gray-900 font-semibold text-base">{payload[0].name || payload[0].payload.month}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} className="text-gray-600 text-sm mt-1">
              {p.dataKey}:{" "}
              {p.dataKey.includes("价值") || p.name.includes("收") || p.name.includes("送") || p.name.includes("净")
                ? `¥${p.value.toFixed(0)}`
                : `${p.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent tracking-tight">
            统计分析
          </h1>
          <div className="flex gap-2">
            {[
              { label: "近30天", value: "30" },
              { label: "近3个月", value: "90" },
              { label: "近一年", value: "365" },
              { label: "全部", value: "all" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  timeRange === option.value
                    ? "bg-gradient-to-r from-[#B8323F] to-[#8B0000] text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-[#FAF7F0] border border-[#D4AF37]/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <div className="group p-8 rounded-3xl bg-gradient-to-br from-white to-[#FAF7F0] border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all hover:shadow-[0_10px_40px_rgba(212,175,55,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">总礼物数</p>
              <Gift className="w-7 h-7 text-blue-500" />
            </div>
            <p className="text-5xl font-semibold text-[#B8323F]">{stats.totalGifts}</p>
          </div>

          <div className="group p-8 rounded-3xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 hover:border-purple-300 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">主动送礼</p>
              <Send className="w-7 h-7 text-purple-500" />
            </div>
            <p className="text-5xl font-semibold text-[#8B0000]">{stats.sentCount}</p>
          </div>

          <div className="group p-8 rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 hover:border-orange-300 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">待回礼</p>
              <TrendingUp className="w-7 h-7 text-orange-500" />
            </div>
            <p className="text-5xl font-semibold text-[#D4AF37]">{stats.pendingCount}</p>
          </div>

          <div className="group p-8 rounded-3xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 hover:border-green-300 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">已回礼</p>
              <Users className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-5xl font-semibold text-green-600">{stats.repliedCount}</p>
          </div>

          <div className="group p-8 rounded-3xl bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200 hover:border-pink-300 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">礼物平衡</p>
              <BarChart3 className="w-7 h-7 text-pink-500" />
            </div>
            <p className="text-4xl font-semibold text-gray-900">
              ¥{(stats.receivedValue - stats.sentValue).toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">收礼 - 送礼</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="p-12 rounded-[2rem] border-2 border-[#D4AF37]/30 bg-gradient-to-br from-white via-[#FAF7F0]/30 to-[#F5E6D3]/20 shadow-[0_20px_70px_rgba(212,175,55,0.25)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-[#B8323F] via-[#8B0000] to-[#D4AF37] bg-clip-text text-transparent tracking-tight">
                成本分析报告
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-[#D4AF37] to-transparent rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {/* 平均收礼价值 */}
              <div className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 via-white to-[#FAF7F0] border-2 border-[#D4AF37] hover:border-[#B8323F] transition-all hover:shadow-[0_15px_40px_rgba(184,50,63,0.2)] hover:scale-105 duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-2xl"></div>
                <DollarSign className="w-10 h-10 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-600 mb-3">平均收礼价值</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent">
                  ¥{stats.costAnalysis.avgReceivedValue.toFixed(0)}
                </p>
              </div>

              {/* 平均送礼成本 */}
              <div className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#B8323F]/10 via-white to-[#FAF7F0] border-2 border-[#B8323F] hover:border-[#8B0000] transition-all hover:shadow-[0_15px_40px_rgba(139,0,0,0.2)] hover:scale-105 duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#B8323F]/10 to-transparent rounded-full blur-2xl"></div>
                <TrendingDown className="w-10 h-10 text-[#B8323F] mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-600 mb-3">平均送礼成本</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
                  ¥{stats.costAnalysis.avgSentValue.toFixed(0)}
                </p>
              </div>

              {/* 投资回报率 */}
              <div className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-[#FAF7F0] border-2 border-emerald-500 hover:border-emerald-600 transition-all hover:shadow-[0_15px_40px_rgba(16,185,129,0.2)] hover:scale-105 duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl"></div>
                <TrendingUp className="w-10 h-10 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-600 mb-3">投资回报率</p>
                {stats.costAnalysis.roi === null ? (
                  <div>
                    <p className="text-4xl font-bold text-gray-400">N/A</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.costAnalysis.totalSent === 0 ? "暂无送礼记录" : "数据不足"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      className={`text-4xl font-bold ${stats.costAnalysis.roi >= 0 ? "bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent" : "bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent"}`}
                    >
                      {stats.costAnalysis.roi.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {stats.costAnalysis.roi > 0 ? "✓ 正回报" : stats.costAnalysis.roi < 0 ? "✗ 负回报" : "— 持平"}
                    </p>
                  </div>
                )}
              </div>

              {/* 回礼完成率 */}
              <div className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-orange-50 via-white to-[#FAF7F0] border-2 border-[#D4AF37]/70 hover:border-[#D4AF37] transition-all hover:shadow-[0_15px_40px_rgba(212,175,55,0.2)] hover:scale-105 duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl"></div>
                <Calendar className="w-10 h-10 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-600 mb-3">回礼完成率</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-[#D4AF37] bg-clip-text text-transparent">
                  {(stats.costAnalysis.replyRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 净收支平衡 */}
              <div className="group relative overflow-hidden p-10 rounded-2xl bg-gradient-to-br from-white to-[#FAF7F0] border-2 border-[#D4AF37] hover:border-[#B8323F] transition-all hover:shadow-[0_20px_60px_rgba(184,50,63,0.15)] duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-3xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8323F]/10">
                      <BarChart3 className="w-7 h-7 text-[#B8323F]" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">净收支平衡</p>
                  </div>
                  <p
                    className={`text-6xl font-bold ${stats.costAnalysis.netBalance >= 0 ? "bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent" : "bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent"}`}
                  >
                    ¥{stats.costAnalysis.netBalance.toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-3">
                    {stats.costAnalysis.netBalance >= 0 ? "收入大于支出" : "支出大于收入"}
                  </p>
                </div>
              </div>

              {/* 库存价值 */}
              <div className="group relative overflow-hidden p-10 rounded-2xl bg-gradient-to-br from-white to-[#FAF7F0] border-2 border-[#D4AF37] hover:border-[#B8323F] transition-all hover:shadow-[0_20px_60px_rgba(184,50,63,0.15)] duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-3xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8323F]/10">
                      <Gift className="w-7 h-7 text-[#D4AF37]" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">当前库存价值</p>
                  </div>
                  <p className="text-6xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent">
                    ¥{stats.costAnalysis.inventoryValue.toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-3">可用于送礼的资产</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {stats.monthlyTrend.length > 0 && (
          <div className="mb-10">
            <div className="p-12 rounded-[2rem] border-2 border-[#D4AF37]/30 bg-gradient-to-br from-white to-[#FAF7F0]/50 hover:border-[#D4AF37] transition-all hover:shadow-[0_10px_50px_rgba(212,175,55,0.15)]">
              <h2 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-10 tracking-tight">
                送礼趋势分析
              </h2>
              <div className="h-96 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#8B7355"
                      style={{ fontSize: "14px", fontWeight: "600" }}
                      tickLine={false}
                      axisLine={{ stroke: "#D4AF37", strokeWidth: 2 }}
                    />
                    <YAxis
                      stroke="#8B7355"
                      style={{ fontSize: "14px", fontWeight: "600" }}
                      tickLine={false}
                      axisLine={{ stroke: "#D4AF37", strokeWidth: 2 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(212, 175, 55, 0.1)" }} />
                    <Legend
                      wrapperStyle={{ paddingTop: "20px", fontSize: "15px", fontWeight: "600" }}
                      iconType="circle"
                    />
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B8323F" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#B8323F" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="收到"
                      stroke="#D4AF37"
                      fill="url(#colorReceived)"
                      strokeWidth={3}
                      dot={{ fill: "#D4AF37", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="送出"
                      stroke="#B8323F"
                      fill="url(#colorSent)"
                      strokeWidth={3}
                      dot={{ fill: "#B8323F", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="净收入"
                      stroke="#8B0000"
                      strokeWidth={4}
                      dot={{ fill: "#8B0000", r: 6, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 8 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAF7F0] to-white border-2 border-[#D4AF37]/30">
                  <p className="text-sm text-gray-600 mb-2">收礼趋势</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {(() => {
                      const currentMonth = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "short" })
                      const currentData = stats.monthlyTrend.find((t) => t.month === currentMonth)
                      const latestData = stats.monthlyTrend[stats.monthlyTrend.length - 1]
                      return currentData?.收礼数 || latestData?.收礼数 || 0
                    })()} 份 / 月
                  </p>
                  <p className="text-xs text-gray-500 mt-1">最近一个月</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAF7F0] to-white border-2 border-[#D4AF37]/30">
                  <p className="text-sm text-gray-600 mb-2">送礼趋势</p>
                  <p className="text-2xl font-semibold text-purple-600">
                    {(() => {
                      const currentMonth = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "short" })
                      const currentData = stats.monthlyTrend.find((t) => t.month === currentMonth)
                      const latestData = stats.monthlyTrend[stats.monthlyTrend.length - 1]
                      return currentData?.送礼数 || latestData?.送礼数 || 0
                    })()} 份 / 月
                  </p>
                  <p className="text-xs text-gray-500 mt-1">最近一个月</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {stats.personAnalysis.length > 0 && (
          <div className="mb-10">
            <div className="p-12 rounded-[2rem] border-2 border-[#D4AF37]/30 bg-gradient-to-br from-white to-[#FAF7F0]/50 hover:border-[#D4AF37] transition-all hover:shadow-[0_10px_50px_rgba(212,175,55,0.15)]">
              <h2 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-10 tracking-tight">
                人员往来分析
              </h2>
              <div className="space-y-4">
                {stats.personAnalysis.map((person, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-semibold text-gray-900">{person.name}</span>
                      <span className={`text-2xl font-bold ${person.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {person.balance >= 0 ? "+" : ""}¥{person.balance.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                      <div>
                        <span className="text-gray-600">收到:</span>
                        <span className="ml-2 text-blue-600 font-semibold">¥{person.received.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">送出:</span>
                        <span className="ml-2 text-purple-600 font-semibold">¥{person.sent.toFixed(0)}</span>
                      </div>
                      <div className="ml-auto">
                        <span className="text-gray-500 text-xs">{person.balance >= 0 ? "需要回礼" : "已回礼充足"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {stats.byCategory.length > 0 && (
            <div className="p-10 rounded-3xl border-2 border-[#D4AF37]/30 bg-white hover:border-[#D4AF37] transition-all hover:shadow-lg">
              <h2 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-10 tracking-tight">
                按品类统计
              </h2>
              <div className="space-y-8">
                {stats.byCategory.map(([category, count]) => {
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-lg">{category}</span>
                      <div className="flex items-center gap-5">
                        <div className="w-56 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#B8323F] via-[#D4AF37] to-[#B8860B] h-2 rounded-full transition-all duration-700"
                            style={{
                              width: `${(count / stats.totalGifts) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-gray-900 font-semibold text-xl min-w-10">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {stats.bySource.length > 0 && (
            <div className="p-10 rounded-3xl border-2 border-[#D4AF37]/30 bg-white hover:border-[#D4AF37] transition-all hover:shadow-lg">
              <h2 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-10 tracking-tight">
                按来源统计
              </h2>
              <div className="space-y-8">
                {stats.bySource.map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium truncate text-lg">{source}</span>
                    <div className="flex items-center gap-5">
                      <div className="w-56 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#B8860B] h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${(count / stats.totalGifts) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-gray-900 font-semibold text-xl min-w-10">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
