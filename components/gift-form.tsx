"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import PhotoUpload from "./photo-upload"
import { CATEGORY_OPTIONS } from "@/lib/constants"

interface GiftFormProps {
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: any
  isSubmitting?: boolean // 添加提交状态属性
}

interface ItemRow {
  item_name: string
  quantity: number
  unit_price: number
  category: string
}

export default function GiftForm({ onClose, onSubmit, initialData, isSubmitting = false }: GiftFormProps) {
  const [formData, setFormData] = useState({
    from: "",
    company: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const [items, setItems] = useState<ItemRow[]>([{ item_name: "", quantity: 1, unit_price: 0, category: "其他" }])
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    if (initialData) {
      setFormData({
        from: initialData.from_person,
        company: initialData.from_company || "",
        date: initialData.received_date.split("T")[0],
        notes: initialData.notes || "",
      })
      setItems(initialData.items || [{ item_name: "", quantity: 1, unit_price: 0, category: "其他" }])
      setPhotos(initialData.photos || [])
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleItemChange = (index: number, field: keyof ItemRow, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { item_name: "", quantity: 1, unit_price: 0, category: "其他" }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    onSubmit({
      ...formData,
      items,
      photos,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
              {initialData ? "编辑礼物" : "添加礼物"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">送礼人</label>
                <input
                  type="text"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                  placeholder="输入送礼人名字"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">送礼公司（可选）</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                  placeholder="输入送礼公司"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">收礼时间</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">物品清单</label>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  添加物品
                </button>
              </div>

              <div className="flex gap-3 items-center mb-2 text-xs font-medium text-gray-500">
                <div className="flex-1">物品名称</div>
                <div className="w-32">品类</div>
                <div className="w-20">数量</div>
                <div className="w-28">单价</div>
                <div className="w-28">小计</div>
                {items.length > 1 && <div className="w-10"></div>}
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="如：iPhone 15"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={item.category}
                        onChange={(e) => handleItemChange(index, "category", e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="数量"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="单价"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div className="w-28 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 font-medium text-center">
                      ¥{(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={isSubmitting}
                        className="p-3 hover:bg-red-50 rounded-xl transition-all text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">总计</p>
                  <p className="text-2xl font-bold text-blue-500">¥{calculateTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <PhotoUpload onUploadComplete={(urls) => setPhotos(urls)} maxPhotos={5} existingPhotos={photos} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors resize-none disabled:opacity-50"
                placeholder="添加备注信息..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "提交中..." : initialData ? "更新" : "添加"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
