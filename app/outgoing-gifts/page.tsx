"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Trash2, Send, Search, X, Pencil } from "lucide-react"
import { useSupabaseStore } from "@/lib/supabase-store"
import { PhotoUpload } from "@/components/photo-upload"
import { CATEGORY_OPTIONS } from "@/lib/constants"

export default function OutgoingGifts() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("所有品类")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { outgoingGifts, inventory, fetchOutgoingGifts, fetchInventory, addOutgoingGift, updateOutgoingGift, deleteOutgoingGift } =
    useSupabaseStore()

  const [formData, setFormData] = useState({
    to_person: "",
    to_company: "",
    send_date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const [items, setItems] = useState<
    Array<{
      item_name: string
      category: string
      quantity: number | ""
      unit_price: number | ""
      inventory_id?: string
    }>
  >([{ item_name: "", category: "其他", quantity: "", unit_price: "", inventory_id: undefined }])

  useEffect(() => {
    fetchOutgoingGifts()
    fetchInventory()
  }, [fetchOutgoingGifts, fetchInventory])

  const handleAddItem = () => {
    setItems([...items, { item_name: "", category: "其他", quantity: "", unit_price: "", inventory_id: undefined }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    if (field === "inventory_id" && value) {
      const selectedItem = inventory.find((i) => i.id === value)
      if (selectedItem) {
        newItems[index] = {
          ...newItems[index],
          inventory_id: value,
          item_name: selectedItem.name,
          category: selectedItem.category,
          unit_price: selectedItem.price,
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const validItems = items.map(item => ({
        ...item,
        quantity: typeof item.quantity === "string" ? 0 : item.quantity,
        unit_price: typeof item.unit_price === "string" ? 0 : item.unit_price,
      }))
      
      if (editingId) {
        await updateOutgoingGift(editingId, { ...formData, photos }, validItems)
        setEditingId(null)
      } else {
        await addOutgoingGift({ ...formData, photos }, validItems)
      }
      
      setIsFormOpen(false)
      setFormData({ to_person: "", to_company: "", send_date: new Date().toISOString().split("T")[0], notes: "" })
      setItems([{ item_name: "", category: "其他", quantity: "", unit_price: "", inventory_id: undefined }])
      setPhotos([])
    } catch (error) {
      console.error("保存主动送礼失败:", error)
      alert("保存失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleEdit = (gift: any) => {
    setEditingId(gift.id)
    setFormData({
      to_person: gift.to_person,
      to_company: gift.to_company || "",
      send_date: gift.send_date.split("T")[0],
      notes: gift.notes || "",
    })
    setItems(gift.items?.map((item: any) => ({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inventory_id: item.inventory_id,
    })) || [{ item_name: "", category: "其他", quantity: "", unit_price: "", inventory_id: undefined }])
    setPhotos(gift.photos || [])
    setIsFormOpen(true)
  }

  const totalCost = items.reduce((sum, item) => {
    const quantity = typeof item.quantity === "string" ? 0 : item.quantity
    const unitPrice = typeof item.unit_price === "string" ? 0 : item.unit_price
    return sum + quantity * unitPrice
  }, 0)

  const filteredGifts = outgoingGifts.filter((gift) => {
    const matchesSearch =
      gift.to_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gift.notes && gift.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory =
      categoryFilter === "所有品类" || (gift.items && gift.items.some((item) => item.category === categoryFilter))
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-2 tracking-tight bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
              主动送礼
            </h1>
            <p className="text-gray-600 text-lg">
              共 {outgoingGifts.length} 份送礼记录
              {filteredGifts.length !== outgoingGifts.length && ` · 显示 ${filteredGifts.length} 份`}
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#8B0000] hover:to-[#6B0000] text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-[#B8323F]/20"
          >
            <Plus className="w-5 h-5" />
            添加送礼
          </button>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="搜索收礼人或备注..."
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
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">{editingId ? "编辑送礼记录" : "添加送礼记录"}</h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false)
                    setEditingId(null)
                    setFormData({ to_person: "", to_company: "", send_date: new Date().toISOString().split("T")[0], notes: "" })
                    setItems([{ item_name: "", category: "其他", quantity: "", unit_price: "", inventory_id: undefined }])
                    setPhotos([])
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-red-500"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">收礼人</label>
                  <input
                    type="text"
                    required
                    value={formData.to_person}
                    onChange={(e) => setFormData({ ...formData, to_person: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400"
                    placeholder="请输入收礼人姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">收礼公司（可选）</label>
                  <input
                    type="text"
                    value={formData.to_company}
                    onChange={(e) => setFormData({ ...formData, to_company: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400"
                    placeholder="请输入收礼人公司"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">送礼时间</label>
                  <input
                    type="date"
                    required
                    value={formData.send_date}
                    onChange={(e) => setFormData({ ...formData, send_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">物品清单</label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                    >
                      + 添加物品
                    </button>
                  </div>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex gap-3">
                          <select
                            value={item.inventory_id || "manual"}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "inventory_id",
                                e.target.value === "manual" ? undefined : e.target.value,
                              )
                            }
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="manual">手动输入</option>
                            {inventory.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (库存: {inv.quantity})
                              </option>
                            ))}
                          </select>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="物品名称"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(index, "category", e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          >
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            placeholder="数量"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value)
                              handleItemChange(index, "quantity", val)
                            }}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            placeholder="单价"
                            value={item.unit_price}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value)
                              handleItemChange(index, "unit_price", val)
                            }}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          小计: <span className="font-semibold text-blue-500">¥{item.quantity * item.unit_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right text-lg font-semibold text-gray-900">
                    总计: <span className="text-blue-500">¥{totalCost}</span>
                  </div>
                </div>

                <div>
                  <PhotoUpload onUploadComplete={setPhotos} maxPhotos={5} existingPhotos={photos} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-400"
                    placeholder="添加备注信息（可选）"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    disabled={isSubmitting}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "保存中..." : "保存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {filteredGifts.length === 0 ? (
          <div className="text-center py-32">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-50 rounded-3xl">
                <Send className="w-16 h-16 text-gray-300" />
              </div>
            </div>
            <p className="text-gray-400 text-xl">
              {searchTerm || categoryFilter !== "所有品类" ? "没有找到匹配的送礼记录" : "暂无送礼记录"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGifts.map((gift) => (
              <div
                key={gift.id}
                className="group p-8 bg-white rounded-3xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-semibold text-gray-900">{gift.to_person}</h3>
                      {gift.to_company && <span className="text-sm text-gray-500">· {gift.to_company}</span>}
                    </div>
                    {gift.photos && gift.photos.length > 0 && (
                      <div className="mb-4 flex gap-2 flex-wrap">
                        {gift.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo || "/placeholder.svg"}
                            alt={`礼物照片 ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setPreviewPhoto(photo)}
                          />
                        ))}
                      </div>
                    )}
                    {gift.items && gift.items.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {gift.items.map((item) => (
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
                              <span className="font-semibold text-blue-500">
                                ¥{(item.quantity * item.unit_price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">送礼时间</p>
                        <p className="text-gray-900 font-medium text-lg">
                          {new Date(gift.send_date).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">总花费</p>
                        <p className="text-blue-500 font-semibold text-2xl">¥{gift.total_cost}</p>
                      </div>
                    </div>
                    {gift.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">{gift.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-6">
                    <button
                      onClick={() => handleEdit(gift)}
                      className="p-2.5 hover:bg-blue-50 rounded-xl transition-all text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteOutgoingGift(gift.id)}
                      className="p-2.5 hover:bg-red-50 rounded-xl transition-all text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewPhoto || "/placeholder.svg"}
            alt="预览"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
