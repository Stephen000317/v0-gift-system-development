"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit, Package, Search } from "lucide-react"
import InventoryForm from "@/components/inventory-form"
import { useSupabaseStore } from "@/lib/supabase-store"

export default function Inventory() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { inventory, addInventory, deleteInventory, updateInventory, fetchInventory } = useSupabaseStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleSave = async (item: any) => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      if (editingId) {
        await updateInventory(editingId, item)
      } else {
        await addInventory(item)
      }
      setIsFormOpen(false)
      setEditingId(null)
      setEditingItem(null)
    } catch (error) {
      console.error("保存库存失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: any) => {
    setEditingId(item.id)
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const getCategoryStats = () => {
    const stats: Record<string, { quantity: number; totalValue: number }> = {}
    inventory.forEach((item) => {
      const category = item.category || "其他"
      if (!stats[category]) {
        stats[category] = { quantity: 0, totalValue: 0 }
      }
      stats[category].quantity += item.quantity || 0
      stats[category].totalValue += (item.quantity || 0) * (Number.parseFloat(String(item.price)) || 0)
    })
    return stats
  }

  const categoryStats = getCategoryStats()

  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && item.quantity <= 0) ||
      (stockFilter === "normal" && item.quantity > 0)
    return matchesSearch && matchesStock
  })

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-semibold bg-gradient-to-r from-[#B8323F] via-[#D4AF37] to-[#B8323F] bg-clip-text text-transparent mb-2 tracking-tight animate-gradient">
              库存管理
            </h1>
            <p className="text-gray-600 text-lg">
              共 {inventory.length} 种商品
              {filteredItems.length !== inventory.length && ` · 显示 ${filteredItems.length} 种`}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null)
              setEditingItem(null)
              setIsFormOpen(true)
            }}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#B8323F] to-[#D4AF37] hover:from-[#A02935] hover:to-[#C5A028] text-white rounded-2xl font-medium transition-all duration-300 shadow-[0_4px_20px_rgba(184,50,63,0.3)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.5)] hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            添加商品
          </button>
        </div>

        {Object.keys(categoryStats).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-4">
              品类统计
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(categoryStats).map(([category, stats]) => (
                <div
                  key={category}
                  className="p-6 bg-gradient-to-br from-white to-[#FAF7F0] border-2 border-[#D4AF37]/30 rounded-2xl hover:border-[#B8323F] hover:shadow-[0_8px_30px_rgba(184,50,63,0.2)] transition-all duration-300 hover:scale-105 group"
                >
                  <p className="text-sm text-gray-600 font-medium mb-3 group-hover:text-[#B8323F] transition-colors">
                    {category}
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-2">
                    {stats.quantity}
                  </p>
                  <p className="text-sm font-semibold text-[#D4AF37]">¥{stats.totalValue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="搜索商品名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-[#D4AF37]/40 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#B8323F] focus:shadow-[0_4px_20px_rgba(184,50,63,0.2)] transition-all"
            />
          </div>
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-4 py-4 bg-white border-2 border-[#D4AF37]/40 rounded-2xl text-gray-900 focus:outline-none focus:border-[#B8323F] focus:shadow-[0_4px_20px_rgba(184,50,63,0.2)] transition-all cursor-pointer"
            >
              <option value="all">所有库存</option>
              <option value="low">库存不足</option>
              <option value="normal">库存正常</option>
            </select>
          </div>
        </div>

        {isFormOpen && (
          <InventoryForm
            onClose={() => {
              setIsFormOpen(false)
              setEditingId(null)
              setEditingItem(null)
            }}
            onSubmit={handleSave}
            initialData={editingItem}
            isSubmitting={isSubmitting}
          />
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-32">
            <div className="flex justify-center mb-6">
              <div className="p-8 bg-gradient-to-br from-[#D4AF37]/10 to-[#B8323F]/10 rounded-3xl">
                <Package className="w-20 h-20 text-[#D4AF37]" />
              </div>
            </div>
            <p className="text-gray-400 text-xl">
              {searchTerm || stockFilter !== "all" ? "没有找到匹配的商品" : "暂无库存数据"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredItems.map((item) => {
              return (
                <div
                  key={item.id}
                  className="group p-8 bg-gradient-to-br from-white to-[#FAF7F0] rounded-3xl border-2 border-[#D4AF37]/30 hover:border-[#B8323F] transition-all duration-300 hover:shadow-[0_10px_40px_rgba(184,50,63,0.2)] hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
                          {item.name}
                        </h3>
                        {item.category && (
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 text-[#8B7355] rounded-full font-semibold border border-[#D4AF37]/30">
                            {item.category}
                          </span>
                        )}
                        {item.source === "received" && (
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-full font-semibold border border-blue-200">
                            收到的礼物
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-base mb-6 leading-relaxed">{item.description}</p>

                      {item.photos && item.photos.length > 0 && (
                        <div className="mb-6">
                          <div className="flex gap-2 flex-wrap">
                            {item.photos.map((photo, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedPhoto(photo)}
                                className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 hover:border-[#B8323F] transition-all hover:scale-110 hover:shadow-[0_4px_20px_rgba(184,50,63,0.3)]"
                              >
                                <img
                                  src={photo || "/placeholder.svg"}
                                  alt={`${item.name} ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-6">
                        <div className="p-4 bg-gradient-to-br from-[#B8323F]/5 to-[#B8323F]/10 rounded-2xl border border-[#B8323F]/20">
                          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">库存</p>
                          <p className="font-bold text-3xl bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
                            {item.quantity}
                          </p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-[#D4AF37]/5 to-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/20">
                          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">单价</p>
                          <p className="font-bold text-xl text-[#8B7355]">
                            ¥{Number.parseFloat(String(item.price)).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">总值</p>
                          <p className="font-bold text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            ¥{((item.quantity || 0) * Number.parseFloat(String(item.price))).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-6">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-3 hover:bg-[#D4AF37]/10 rounded-2xl transition-all text-gray-400 hover:text-[#D4AF37] border-2 border-transparent hover:border-[#D4AF37]/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteInventory(item.id)}
                        className="p-3 hover:bg-red-50 rounded-2xl transition-all text-gray-400 hover:text-red-500 border-2 border-transparent hover:border-red-200"
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

        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedPhoto || "/placeholder.svg"}
                alt="预览"
                className="max-w-full max-h-[90vh] rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.5)] border-4 border-[#D4AF37]/50"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-3 bg-white/95 hover:bg-white rounded-full text-gray-700 shadow-2xl hover:scale-110 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
