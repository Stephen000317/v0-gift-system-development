"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit, Gift, Search, Filter, ImageIcon } from "lucide-react"
import GiftForm from "@/components/gift-form"
import { useSupabaseStore } from "@/lib/supabase-store"

export default function ReceivedGifts() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const gifts = useSupabaseStore((state) => state.gifts)
  const addGift = useSupabaseStore((state) => state.addGift)
  const deleteGift = useSupabaseStore((state) => state.deleteGift)
  const deleteGifts = useSupabaseStore((state) => state.deleteGifts)
  const updateGift = useSupabaseStore((state) => state.updateGift)
  const addInventory = useSupabaseStore((state) => state.addInventory)
  const fetchGifts = useSupabaseStore((state) => state.fetchGifts)
  const fetchContacts = useSupabaseStore((state) => state.fetchContacts)
  const fetchInventory = useSupabaseStore((state) => state.fetchInventory)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingGift, setEditingGift] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("所有品类")
  const [statusFilter, setStatusFilter] = useState("所有状态")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [priceRange, setPriceRange] = useState({ min: "", max: "" })
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchGifts()
    fetchContacts()
  }, [fetchGifts, fetchContacts])

  const handleEdit = (gift: any) => {
    setEditingGift(gift)
    setEditingId(gift.id)
    setIsFormOpen(true)
  }

  const handleSave = async (data: any) => {
    if (isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)

      // 计算物品总价值
      const totalValue = data.items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)

      const giftData = {
        from_person: data.from,
        from_company: data.company || "",
        gift_name: data.items.map((item: any) => item.item_name).join("、"),
        category: data.items[0]?.category || "其他",
        estimated_value: totalValue,
        received_date: data.date,
        notes: data.notes || "",
        photos: data.photos || [],
      }

      if (editingId) {
        // 更新礼物基本信息
        await updateGift(editingId, giftData)

        // 更新物品清单：先删除旧的，再插入新的
        const supabase = (await import("@/lib/supabase/client")).createClient()
        
        // 删除旧的物品清单
        await supabase.from("gift_items").delete().eq("gift_id", editingId)
        
        // 插入新的物品清单（subtotal是自动生成列，不需要手动插入）
        const itemsWithGiftId = data.items.map((item: any) => ({
          gift_id: editingId,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          category: item.category,
        }))
        
        await supabase.from("gift_items").insert(itemsWithGiftId)

        // 重新获取数据以刷新界面
        await fetchGifts()
        await fetchInventory()

        // 关闭对话框
        setIsFormOpen(false)
        setEditingId(null)
        setEditingGift(null)
      } else {
        const giftId = await addGift(giftData, data.items)

        for (const item of data.items) {
          await addInventory({
            name: item.item_name,
            category: item.category,
            quantity: item.quantity,
            price: item.unit_price,
            description: `来自 ${data.from} 的礼物`,
            source: "received",
            gift_id: giftId,
          })
        }
        setIsFormOpen(false)
      }
    } catch (error) {
      console.error("[v0] 保存礼物失败:", error)
      alert("保存失败，请检查网络连接或重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      电子产品: { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
      酒类: { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30" },
      礼品: { bg: "bg-pink-500/10", text: "text-pink-300", border: "border-pink-500/30" },
      食品: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
      其他: { bg: "bg-gray-500/10", text: "text-gray-300", border: "border-gray-500/30" },
    }
    return colors[category] || colors["其他"]
  }

  const getCategoryName = (category: string) => {
    return category
  }

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch =
      gift.from_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gift.gift_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "所有品类" || gift.category === categoryFilter
    const matchesStatus = statusFilter === "所有状态" || gift.status === statusFilter

    // 日期范围筛选
    let matchesDateRange = true
    if (dateRange.start) {
      matchesDateRange = matchesDateRange && gift.received_date >= dateRange.start
    }
    if (dateRange.end) {
      matchesDateRange = matchesDateRange && gift.received_date <= dateRange.end
    }

    // 价格范围筛选
    let matchesPriceRange = true
    if (priceRange.min) {
      matchesPriceRange = matchesPriceRange && gift.estimated_value >= Number(priceRange.min)
    }
    if (priceRange.max) {
      matchesPriceRange = matchesPriceRange && gift.estimated_value <= Number(priceRange.max)
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDateRange && matchesPriceRange
  })

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 份礼物吗？`)) return

    await deleteGifts(selectedIds)
    setSelectedIds([])
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredGifts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredGifts.map((g) => g.id))
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-2 tracking-tight bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
              接收礼物
            </h1>
            <p className="text-gray-600 text-lg">
              共 {gifts.length} 份礼物{filteredGifts.length !== gifts.length && ` · 显示 ${filteredGifts.length} 份`}
              {selectedIds.length > 0 && ` · 已选择 ${selectedIds.length} 份`}
            </p>
          </div>
          <div className="flex gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                批量删除 ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => {
                setEditingId(null)
                setEditingGift(null)
                setIsFormOpen(true)
              }}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#8B0000] hover:to-[#6B0000] text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-[#B8323F]/20"
            >
              <Plus className="w-5 h-5" />
              添加礼物
            </button>
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="搜索送礼人或礼物描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#D4AF37]/30 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="所有品类">所有品类</option>
              <option value="电子产品">电子产品</option>
              <option value="酒类">酒类</option>
              <option value="礼品">礼品</option>
              <option value="食品">食品</option>
              <option value="其他">其他</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="所有状态">所有状态</option>
              <option value="待回礼">待回礼</option>
              <option value="已回礼">已回礼</option>
            </select>
            <button
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                showAdvancedFilter ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              <Filter className="w-5 h-5" />
              高级筛选
            </button>
          </div>

          {showAdvancedFilter && (
            <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">日期范围</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-gray-500">至</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">价格范围</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="最低价"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="最高价"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setDateRange({ start: "", end: "" })
                    setPriceRange({ min: "", max: "" })
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  重置筛选
                </button>
              </div>
            </div>
          )}
        </div>

        {isFormOpen && (
          <GiftForm
            onClose={() => {
              setIsFormOpen(false)
              setEditingId(null)
              setEditingGift(null)
            }}
            onSubmit={handleSave}
            initialData={editingGift}
            isSubmitting={isSubmitting}
          />
        )}

        {filteredGifts.length === 0 ? (
          <div className="text-center py-32">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-50 rounded-3xl">
                <Gift className="w-16 h-16 text-gray-300" />
              </div>
            </div>
            <p className="text-gray-400 text-xl">
              {searchTerm || categoryFilter !== "所有品类" || statusFilter !== "所有状态"
                ? "没有找到匹配的礼物"
                : "暂无礼物记录"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGifts.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredGifts.length}
                  onChange={handleSelectAll}
                  className="w-5 h-5 mt-1 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {selectedIds.length === filteredGifts.length ? "取消全选" : "全选"}
                </span>
              </div>
            )}

            {filteredGifts.map((gift) => {
              const colors = getCategoryColor(gift.category)
              return (
                <div
                  key={gift.id}
                  className="group p-8 bg-white rounded-3xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(gift.id)}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          prev.includes(gift.id) ? prev.filter((id) => id !== gift.id) : [...prev, gift.id],
                        )
                      }}
                      className="w-5 h-5 mt-1 rounded border-gray-300"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-semibold text-gray-900">{gift.from_person}</h3>
                        {gift.from_company && <span className="text-sm text-gray-500">· {gift.from_company}</span>}
                        <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700">
                          {gift.category}
                        </span>
                      </div>
                      {gift.gift_items && gift.gift_items.length > 0 && (
                        <div className="mb-6 space-y-2">
                          {gift.gift_items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                                  {item.category}
                                </span>
                                <span className="font-medium text-gray-900">{item.item_name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-500">
                                  数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                </span>
                                <span className="text-gray-500">
                                  单价 <span className="font-medium text-gray-900">¥{item.unit_price}</span>
                                </span>
                                <span className="font-semibold text-blue-500">¥{item.subtotal}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {gift.photos && gift.photos.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">礼物照片</p>
                          </div>
                          <div className="flex gap-2 overflow-x-auto">
                            {gift.photos.map((photo, index) => (
                              <img
                                key={index}
                                src={photo || "/placeholder.svg"}
                                alt={`礼物照片 ${index + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => window.open(photo, "_blank")}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">收礼时间</p>
                          <p className="text-gray-900 font-medium text-lg">
                            {new Date(gift.received_date).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">总估值</p>
                          <p className="text-blue-500 font-semibold text-2xl">¥{gift.estimated_value}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">状态</p>
                          <span
                            className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                              gift.status === "待回礼" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                            }`}
                          >
                            {gift.status === "待回礼" ? "待回礼" : "已回礼"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-6">
                      <button
                        onClick={() => handleEdit(gift)}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteGift(gift.id)}
                        className="p-2.5 hover:bg-red-50 rounded-xl transition-all text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
