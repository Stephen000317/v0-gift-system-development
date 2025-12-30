"use client"

import { useState, useEffect } from "react"
import { useSupabaseStore } from "@/lib/supabase-store"
import { Gift, Clock, RefreshCw, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CATEGORY_OPTIONS } from "@/lib/constants"

interface ReplyItemForm {
  item_name: string
  category: string
  quantity: number
  unit_price: number
  inventory_id?: string
}

export default function GiftReplyPage() {
  const { gifts, inventory, fetchGifts, fetchInventory, replyToGift, cancelReply } = useSupabaseStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [replyDate, setReplyDate] = useState(new Date().toISOString().split("T")[0])
  const [replyItems, setReplyItems] = useState<ReplyItemForm[]>([
    { item_name: "", category: "其他", quantity: 1, unit_price: 0 },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    fetchGifts()
    fetchInventory()
  }, [fetchGifts, fetchInventory])

  const pendingGifts = gifts.filter((g) => g.status === "待回礼")
  const repliedGifts = gifts.filter((g) => g.status === "已回礼")

  const handleStartReply = (gift: any) => {
    setEditingId(gift.id)
    setReplyDate(new Date().toISOString().split("T")[0])
    setReplyItems([{ item_name: "", category: "其他", quantity: 1, unit_price: 0 }])
  }

  const handleAddItem = () => {
    setReplyItems([...replyItems, { item_name: "", category: "其他", quantity: 1, unit_price: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    if (replyItems.length > 1) {
      setReplyItems(replyItems.filter((_, i) => i !== index))
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...replyItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReplyItems(newItems)
  }

  const handleSelectFromInventory = (index: number, inventoryId: string) => {
    const item = inventory.find((i) => i.id === inventoryId)
    if (item) {
      const newItems = [...replyItems]
      newItems[index] = {
        item_name: item.name,
        category: item.category,
        quantity: 1,
        unit_price: item.price,
        inventory_id: inventoryId,
      }
      setReplyItems(newItems)
    }
  }

  const handleSaveReply = async () => {
    if (isSubmitting || !editingId) return

    try {
      setIsSubmitting(true)
      await replyToGift(editingId, replyDate, replyItems)
      setEditingId(null)
      setReplyItems([{ item_name: "", category: "其他", quantity: 1, unit_price: 0, inventory_id: undefined }])
    } catch (error) {
      console.error("回礼失败:", error)
      alert("回礼失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    await fetchGifts()
    await fetchInventory()
  }

  const handleCancelReply = async (giftId: string, giftName: string) => {
    if (!confirm(`确定要取消对"${giftName}"的回礼吗？库存将会恢复。`)) {
      return
    }

    setIsCancelling(true)
    try {
      await cancelReply(giftId)
      alert("回礼已取消，库存已恢复")
    } catch (error) {
      console.error("[v0] 取消回礼失败:", error)
      alert("取消回礼失败，请重试")
    } finally {
      setIsCancelling(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      电子产品: {
        bg: "bg-gradient-to-br from-[#D4AF37]/10 to-[#B8860B]/10",
        text: "text-[#D4AF37]",
        border: "border-[#D4AF37]/30",
      },
      酒类: {
        bg: "bg-gradient-to-br from-[#B8323F]/10 to-[#8B0000]/10",
        text: "text-[#B8323F]",
        border: "border-[#B8323F]/30",
      },
      礼品: {
        bg: "bg-gradient-to-br from-[#DC143C]/10 to-[#B8323F]/10",
        text: "text-[#DC143C]",
        border: "border-[#DC143C]/30",
      },
      食品: {
        bg: "bg-gradient-to-br from-[#CD7F32]/10 to-[#B8860B]/10",
        text: "text-[#CD7F32]",
        border: "border-[#CD7F32]/30",
      },
      其他: {
        bg: "bg-gradient-to-br from-[#8B4513]/10 to-[#654321]/10",
        text: "text-[#8B4513]",
        border: "border-[#8B4513]/30",
      },
    }
    return colors[category] || colors["其他"]
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
  }

  const totalReplyCost = replyItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#D4AF37] to-[#B8860B] rounded-2xl shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-semibold text-gray-900 tracking-tight bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
                  待回礼
                </h2>
                <p className="text-gray-600 text-lg mt-1">共 {pendingGifts.length} 份</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isSubmitting || isCancelling}
              className="px-4 py-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#B8860B]/20 hover:from-[#D4AF37]/30 hover:to-[#B8860B]/30 text-gray-700 border border-[#D4AF37]/30 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${isSubmitting || isCancelling ? "animate-spin" : ""}`} />
              刷新数据
            </button>
          </div>

          {pendingGifts.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-white to-[#FAF7F0]">
              <Gift className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <p className="text-gray-400 text-xl">所有礼物都已回礼</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingGifts.map((gift) => {
                const isEditing = editingId === gift.id
                const totalValue =
                  gift.items?.reduce(
                    (sum, item) => sum + item.quantity * Number.parseFloat(String(item.unit_price)),
                    0,
                  ) || 0

                return (
                  <div key={gift.id} className="group rounded-3xl transition-all duration-200">
                    <div className="p-8 border border-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 rounded-3xl transition-all bg-white hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
                              {gift.from_person}
                            </h3>
                          </div>

                          {gift.items && gift.items.length > 0 ? (
                            <div className="space-y-2">
                              {gift.items.map((item, index) => {
                                const colors = getCategoryColor(item.category)
                                return (
                                  <div
                                    key={index}
                                    className={`flex items-center justify-between p-3 ${colors.bg} rounded-lg border ${colors.border}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`text-xs px-2 py-1 rounded-md bg-white/80 border ${colors.border} ${colors.text} font-medium`}
                                      >
                                        {item.category}
                                      </span>
                                      <span className="font-medium text-gray-900">{item.item_name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-gray-500">
                                        数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                      </span>
                                      <span className="text-gray-500">
                                        单价 <span className="font-medium text-[#D4AF37]">¥{item.unit_price}</span>
                                      </span>
                                      <span className="font-semibold text-[#B8323F]">
                                        ¥{(item.quantity * Number.parseFloat(String(item.unit_price))).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-base mb-4 leading-relaxed">{gift.gift_name}</p>
                          )}

                          {gift.notes && <p className="text-gray-400 text-sm mb-4 italic">{gift.notes}</p>}

                          <div className="grid grid-cols-3 gap-6 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">收礼时间</p>
                              <p className="text-gray-900 font-medium text-base">{formatDate(gift.received_date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">总估值</p>
                              <p className="text-xl font-semibold bg-gradient-to-r from-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent">
                                ¥{totalValue.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isEditing ? (
                        <button
                          onClick={() => handleStartReply(gift)}
                          className="w-full mt-6 px-4 py-3.5 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#8B0000] hover:to-[#B8323F] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                          <Clock className="w-4 h-4" />
                          开始回礼
                        </button>
                      ) : (
                        <div className="mt-6 p-6 bg-gradient-to-br from-[#FAF7F0] to-white rounded-2xl border border-[#D4AF37]/30 space-y-4">
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700">回礼物品清单</label>
                            <button
                              type="button"
                              onClick={handleAddItem}
                              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium"
                            >
                              <Plus className="w-4 h-4" />
                              添加物品
                            </button>
                          </div>

                          <div className="flex gap-3 items-center mb-2 text-xs font-medium text-gray-500 px-1">
                            <div className="flex-[2]">从库存选择</div>
                            <div className="flex-[2]">物品名称</div>
                            <div className="w-24">品类</div>
                            <div className="w-20">数量</div>
                            <div className="w-24">单价</div>
                            {replyItems.length > 1 && <div className="w-10"></div>}
                          </div>

                          <div className="space-y-3">
                            {replyItems.map((item, index) => (
                              <div
                                key={index}
                                className="flex gap-3 items-center p-4 bg-white rounded-xl border border-gray-200"
                              >
                                {/* 从库存选择 */}
                                <div className="flex-[2]">
                                  <select
                                    value={item.inventory_id || ""}
                                    onChange={(e) => handleSelectFromInventory(index, e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                                  >
                                    <option value="">手动输入</option>
                                    {inventory
                                      .filter((i) => i.quantity > 0)
                                      .map((i) => (
                                        <option key={i.id} value={i.id}>
                                          {i.name} (库存{i.quantity})
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                {/* 物品名称 */}
                                <div className="flex-[2]">
                                  <input
                                    type="text"
                                    value={item.item_name}
                                    onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                                    placeholder="物品名称"
                                    disabled={isSubmitting}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                                  />
                                </div>

                                {/* 品类 */}
                                <div className="w-24">
                                  <select
                                    value={item.category}
                                    onChange={(e) => handleItemChange(index, "category", e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                                  >
                                    {CATEGORY_OPTIONS.map((category) => (
                                      <option key={category} value={category}>
                                        {category}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* 数量 */}
                                <div className="w-20">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 1)
                                    }
                                    placeholder="数量"
                                    disabled={isSubmitting}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                                  />
                                </div>

                                {/* 单价 */}
                                <div className="w-24">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.unit_price}
                                    onChange={(e) =>
                                      handleItemChange(index, "unit_price", Number.parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="单价"
                                    disabled={isSubmitting}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                                  />
                                </div>

                                {/* 删除按钮 */}
                                {replyItems.length > 1 && (
                                  <div className="w-10">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(index)}
                                      className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* 回礼日期 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">回礼日期</label>
                            <Input
                              type="date"
                              value={replyDate}
                              onChange={(e) => setReplyDate(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>

                          {/* 总价显示 */}
                          <div className="p-4 bg-gradient-to-br from-[#D4AF37]/10 to-[#B8860B]/10 rounded-xl border border-[#D4AF37]/30">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-medium">回礼总价值</span>
                              <span className="text-2xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent">
                                ¥{totalReplyCost.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-3 pt-2">
                            <Button
                              variant="solid"
                              size="sm"
                              onClick={handleSaveReply}
                              disabled={
                                isSubmitting ||
                                isCancelling ||
                                !replyItems.every((item) => item.item_name && item.unit_price > 0)
                              }
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#10B981] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                              {isSubmitting ? "提交中..." : "确认回礼"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              disabled={isSubmitting || isCancelling}
                              className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-[#D4AF37]/30 rounded-xl font-medium transition-all"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl shadow-lg">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-semibold bg-gradient-to-r from-[#10B981] to-[#059669] bg-clip-text text-transparent">
                已回礼
              </h2>
              <p className="text-gray-600 text-lg mt-1">共 {repliedGifts.length} 份</p>
            </div>
          </div>

          {repliedGifts.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-white to-[#FAF7F0]">
              <Gift className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <p className="text-gray-400 text-xl">暂无已回礼记录</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {repliedGifts.map((gift) => {
                const replyValue =
                  gift.reply_items?.reduce(
                    (sum, item) => sum + item.quantity * Number.parseFloat(String(item.unit_price)),
                    0,
                  ) || 0

                return (
                  <div key={gift.id} className="group rounded-3xl transition-all duration-200">
                    <div className="p-8 border border-[#10B981]/20 group-hover:border-[#10B981]/40 rounded-3xl transition-all bg-white hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-semibold text-gray-900">{gift.from_person}</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              已回礼
                            </span>
                          </div>

                          {/* 收到的礼物清单 */}
                          {gift.items && gift.items.length > 0 && (
                            <div className="space-y-2">
                              {gift.items.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-1 rounded-md bg-white border border-blue-200 text-blue-600">
                                      {item.category}
                                    </span>
                                    <span className="font-medium text-gray-900">{item.item_name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500">
                                      数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                    </span>
                                    <span className="text-gray-500">
                                      单价 <span className="font-medium text-gray-600">¥{item.unit_price}</span>
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      ¥{(item.quantity * Number.parseFloat(String(item.unit_price))).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                                <span className="text-blue-900 font-medium text-sm">收礼总价值</span>
                                <span className="text-blue-600 font-bold text-lg">¥{replyValue.toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          {/* 回礼清单 */}
                          {gift.reply_items && gift.reply_items.length > 0 && (
                            <div className="space-y-2">
                              {gift.reply_items.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-1 rounded-md bg-white border border-green-200 text-green-600">
                                      {item.category}
                                    </span>
                                    <span className="font-medium text-gray-900">{item.item_name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500">
                                      数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                    </span>
                                    <span className="text-gray-500">
                                      单价 <span className="font-medium text-gray-600">¥{item.unit_price}</span>
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      ¥{(item.quantity * Number.parseFloat(String(item.unit_price))).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-green-200 flex justify-between items-center">
                                <span className="text-green-900 font-medium text-sm">回礼总花费</span>
                                <span className="text-green-600 font-bold text-lg">¥{replyValue.toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-6 text-sm mt-4">
                            <div>
                              <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">收礼时间</p>
                              <p className="text-gray-900 font-medium">{formatDate(gift.received_date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">回礼时间</p>
                              <p className="text-gray-900 font-medium">{formatDate(gift.reply_date || "")}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 取消回礼按钮 */}
                      <div className="ml-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelReply(gift.id, gift.from_person)}
                          disabled={isSubmitting || isCancelling}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          {isCancelling ? "取消中..." : "取消回礼"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
