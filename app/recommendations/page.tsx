"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Gift, Calendar, Package, Sparkles, Wand2 } from "lucide-react"
import { useSupabaseStore } from "@/lib/supabase-store"
import type { SmartRecommendation } from "@/lib/smart-recommendations"

export default function Recommendations() {
  const { gifts, inventory, contacts, replyToGift, fetchGifts, fetchInventory, fetchContacts } = useSupabaseStore()
  const [selectedGift, setSelectedGift] = useState<string | null>(null)
  const [smartRecommendations, setSmartRecommendations] = useState<{ [key: string]: SmartRecommendation[] }>({})
  const [loadingSmart, setLoadingSmart] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchGifts()
    fetchInventory()
    fetchContacts()
  }, [fetchGifts, fetchInventory, fetchContacts])

  const pendingGifts = gifts.filter((g) => g.status === "待回礼")

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) return "spring"
    if (month >= 6 && month <= 8) return "summer"
    if (month >= 9 && month <= 11) return "autumn"
    return "winter"
  }

  const getRecommendations = (gift: any) => {
    if (!gift) return []

    // 查找联系人信息
    const contact = contacts.find((c) => c.name === gift.from_person)
    const totalValue = gift.estimated_value || 0
    const season = getCurrentSeason()

    // 筛选有库存的商品
    let availableItems = inventory.filter((item) => item.quantity > 0)

    // 价格范围：收礼价值的 60%-120%
    const priceRange = {
      min: totalValue * 0.6,
      max: totalValue * 1.2,
    }

    availableItems = availableItems.filter((item) => item.price >= priceRange.min && item.price <= priceRange.max)

    const scoredItems = availableItems.map((item) => {
      let score = 100 // 基础分数

      // 年龄匹配评分
      if (contact?.age) {
        if (contact.age < 18) {
          // 儿童：玩具、文具、零食
          if (item.category.includes("玩具") || item.category.includes("文具") || item.category.includes("零食"))
            score += 30
        } else if (contact.age >= 18 && contact.age < 35) {
          // 年轻人：电子产品、时尚、美妆
          if (
            item.category.includes("电子") ||
            item.category.includes("时尚") ||
            item.category.includes("美妆") ||
            item.category.includes("运动")
          )
            score += 25
        } else if (contact.age >= 35 && contact.age < 60) {
          // 中年：茶叶、保健品、高端礼品
          if (
            item.category.includes("茶") ||
            item.category.includes("酒") ||
            item.category.includes("保健") ||
            item.category.includes("礼品")
          )
            score += 25
        } else {
          // 老年：保健品、传统礼品
          if (item.category.includes("保健") || item.category.includes("传统") || item.category.includes("养生"))
            score += 30
        }
      }

      // 性别匹配评分
      if (contact?.gender === "男") {
        if (
          item.category.includes("酒") ||
          item.category.includes("电子") ||
          item.category.includes("运动") ||
          item.name.includes("茶")
        )
          score += 20
      } else if (contact?.gender === "女") {
        if (
          item.category.includes("美妆") ||
          item.category.includes("鲜花") ||
          item.category.includes("首饰") ||
          item.category.includes("护肤")
        )
          score += 20
      }

      // 季节匹配评分
      if (season === "spring") {
        if (item.category.includes("茶") || item.category.includes("鲜花")) score += 15
      } else if (season === "summer") {
        if (item.category.includes("饮料") || item.category.includes("水果")) score += 15
      } else if (season === "autumn") {
        if (item.category.includes("茶") || item.category.includes("保健")) score += 15
      } else if (season === "winter") {
        if (item.category.includes("酒") || item.category.includes("保暖") || item.category.includes("补品"))
          score += 15
      }

      // 价格接近度评分
      const priceDiff = Math.abs(item.price - totalValue)
      const priceScore = Math.max(0, 20 - (priceDiff / totalValue) * 10)
      score += priceScore

      return { ...item, score }
    })

    // 按评分排序并返回前6个
    return scoredItems.sort((a, b) => b.score - a.score).slice(0, 6)
  }

  const getSmartRecommendations = async (gift: any) => {
    const giftId = gift.id
    setLoadingSmart((prev) => ({ ...prev, [giftId]: true }))

    try {
      const response = await fetch("/api/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId }),
      })

      if (!response.ok) {
        throw new Error("推荐失败")
      }

      const data = await response.json()
      console.log("[v0] 智能推荐结果:", data.recommendations)

      const formattedRecs = data.recommendations.map((rec: any, index: number) => ({
        id: `rec-${giftId}-${index}`,
        category: rec.title,
        matchScore: rec.matchScore,
        reason: rec.reason,
        culturalNote: rec.culturalNote || "", // 新增文化提示
        valueRange: `¥${Math.floor(rec.suggestedValue * 0.9)} - ¥${Math.ceil(rec.suggestedValue * 1.1)}`,
        suggestedItems: rec.items.map((item: any) => item.name),
        tags: [
          rec.items[0]?.category || "通用",
          `${rec.items.length}件商品`,
          `约¥${rec.items.reduce((sum: number, item: any) => sum + item.total, 0).toFixed(0)}`,
        ],
      }))

      setSmartRecommendations((prev) => ({ ...prev, [giftId]: formattedRecs }))
    } catch (error) {
      console.error("[v0] 智能推荐失败:", error)
      alert("推荐失败，请重试")
    } finally {
      setLoadingSmart((prev) => ({ ...prev, [giftId]: false }))
    }
  }

  const handleReply = async (giftId: string, inventoryItem: any) => {
    try {
      console.log("[v0] 选择回礼:", { giftId, inventoryItem })

      const currentDate = new Date().toISOString().split("T")[0]

      await replyToGift(giftId, currentDate, [
        {
          item_name: inventoryItem.name,
          category: inventoryItem.category,
          quantity: 1,
          unit_price: inventoryItem.price,
          inventory_id: inventoryItem.id,
        },
      ])

      console.log("[v0] 回礼成功")
      await fetchGifts()
      await fetchInventory()
    } catch (error) {
      console.error("[v0] 回礼失败:", error)
      alert("回礼失败，请重试")
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("zh-CN")
  }

  const getSeasonLabel = () => {
    const season = getCurrentSeason()
    const labels = {
      spring: "🌸 春季",
      summer: "☀️ 夏季",
      autumn: "🍂 秋季",
      winter: "❄️ 冬季",
    }
    return labels[season]
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent tracking-tight">
            智能回礼建议
          </h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#D4AF37]/30 rounded-2xl shadow-md">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-gray-700 font-medium">{getSeasonLabel()}</span>
          </div>
        </div>

        {pendingGifts.length === 0 ? (
          <div className="text-center py-32">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-green-100 rounded-3xl">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            </div>
            <p className="text-gray-400 text-xl">所有礼物都已回礼</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {pendingGifts.map((gift) => {
              const recommendations = getRecommendations(gift)
              const contact = contacts.find((c) => c.name === gift.from_person)
              const smartRecs = smartRecommendations[gift.id] || []
              const isLoadingSmart = loadingSmart[gift.id] || false

              return (
                <div
                  key={gift.id}
                  className="p-10 rounded-3xl bg-white border-2 border-[#D4AF37]/30 shadow-lg hover:shadow-[0_10px_50px_rgba(212,175,55,0.2)] transition-all"
                >
                  <div className="mb-8">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent tracking-tight">
                        来自：{gift.from_person}
                      </h3>
                      {contact && (contact.age || contact.gender !== "未知") && (
                        <div className="flex gap-2">
                          {contact.gender !== "未知" && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                              {contact.gender}
                            </span>
                          )}
                          {contact.age && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                              {contact.age}岁
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {gift.items && gift.items.length > 0 ? (
                      <div className="mb-4 space-y-2">
                        <p className="text-gray-500 text-sm font-medium mb-2">收到的礼物：</p>
                        {gift.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 text-gray-600">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span>
                              {item.item_name} × {item.quantity} - {item.category} - ¥{item.unit_price}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(gift.received_date)}</span>
                      </div>
                      <span className="text-[#B8323F] font-semibold text-lg">总价值 ¥{gift.estimated_value}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <button
                      onClick={() => getSmartRecommendations(gift)}
                      disabled={isLoadingSmart}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#B8323F] to-[#D4AF37] hover:from-[#A02935] hover:to-[#C4A035] disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-[0_8px_30px_rgba(184,50,63,0.3)]"
                    >
                      <Wand2 className={`w-5 h-5 ${isLoadingSmart ? "animate-spin" : ""}`} />
                      {isLoadingSmart ? "分析中..." : "智能推荐"}
                    </button>
                  </div>

                  {smartRecs.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-500" />
                        智能推荐（共 {smartRecs.length} 种方案）
                      </h4>
                      <div className="grid gap-5">
                        {smartRecs.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-6 rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-br from-[#FAF7F0] to-white hover:border-[#D4AF37] transition-all hover:shadow-[0_8px_30px_rgba(212,175,55,0.2)]"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-semibold text-gray-900 text-xl">{rec.category}</h5>
                                  <div className="px-3 py-1 bg-gradient-to-r from-[#B8323F] to-[#8B0000] text-white text-xs rounded-full font-semibold">
                                    匹配度 {rec.matchScore}分
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {rec.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-[#FAF7F0] text-[#B8323F] text-xs rounded-lg border border-[#D4AF37]/30"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="mb-4 p-4 bg-white rounded-lg border border-[#D4AF37]/30">
                              <p className="text-sm text-purple-700 leading-relaxed">
                                <span className="font-semibold">推荐理由：</span>
                                {rec.reason}
                              </p>
                            </div>

                            {rec.culturalNote && (
                              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-sm text-amber-800 leading-relaxed flex items-center gap-2">
                                  <span className="text-amber-600">💡</span>
                                  <span className="font-semibold">文化提示：</span>
                                  {rec.culturalNote}
                                </p>
                              </div>
                            )}

                            <div className="mb-4">
                              <p className="text-xs text-gray-500 font-medium mb-2">建议价值范围</p>
                              <p className="text-purple-600 font-semibold text-lg">{rec.valueRange}</p>
                            </div>

                            <div className="mb-4">
                              <p className="text-xs text-gray-500 font-medium mb-2">推荐商品</p>
                              <div className="flex flex-wrap gap-2">
                                {rec.suggestedItems.map((itemName, idx) => {
                                  const inventoryItem = inventory.find((i) => i.name === itemName)
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => inventoryItem && handleReply(gift.id, inventoryItem)}
                                      disabled={!inventoryItem || inventoryItem.quantity === 0}
                                      className="px-4 py-2 bg-white hover:bg-purple-100 disabled:bg-gray-100 disabled:text-gray-400 text-purple-700 rounded-lg border border-purple-200 text-sm font-medium transition-all"
                                    >
                                      {itemName}
                                      {inventoryItem && ` (¥${inventoryItem.price})`}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 原有的规则推荐 */}
                  {recommendations.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                      <p className="text-gray-400 text-lg">暂无合适的库存商品推荐</p>
                      <p className="text-gray-400 text-sm mt-2">
                        建议价值范围：¥{(gift.estimated_value * 0.6).toFixed(0)} - ¥
                        {(gift.estimated_value * 1.2).toFixed(0)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                        规则推荐（共 {recommendations.length} 件）
                        {contact && (contact.age || contact.gender !== "未知") && (
                          <span className="text-sm text-gray-500 font-normal ml-2">已根据年龄、性别和季节优化推荐</span>
                        )}
                      </h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {recommendations.map((item) => (
                          <div
                            key={item.id}
                            className="group p-6 rounded-2xl border-2 border-[#D4AF37]/30 bg-white hover:border-[#D4AF37] transition-all hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] relative"
                          >
                            <div className="absolute top-4 right-4">
                              <div className="px-2 py-1 bg-gradient-to-r from-[#B8323F] to-[#8B0000] text-white text-xs rounded-full font-semibold">
                                匹配度 {Math.round((item.score / 200) * 100)}%
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="flex items-start gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900 text-xl flex-1">{item.name}</h4>
                              </div>
                              <span className="inline-block px-2 py-1 bg-gradient-to-r from-[#D4AF37]/20 to-[#B8323F]/20 text-[#8B0000] text-sm rounded-lg font-medium border border-[#D4AF37]/30">
                                {item.category}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{item.description}</p>
                            )}

                            <div className="flex justify-between items-center mb-5">
                              <div>
                                <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">单价</p>
                                <p className="text-[#B8323F] font-semibold text-xl">¥{item.price}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">库存</p>
                                <p className="text-gray-900 font-semibold text-xl">{item.quantity}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleReply(gift.id, item)}
                              disabled={item.quantity === 0}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#A02935] hover:to-[#750000] disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-[0_8px_30px_rgba(184,50,63,0.3)] text-sm"
                            >
                              <Gift className="w-4 h-4" />
                              选择此礼物回礼
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
