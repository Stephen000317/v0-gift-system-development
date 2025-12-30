"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import PhotoUpload from "./photo-upload"
import { CATEGORY_OPTIONS } from "@/lib/constants"

interface InventoryFormProps {
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: any
  isSubmitting?: boolean
}

export default function InventoryForm({ onClose, onSubmit, initialData, isSubmitting = false }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "其他", // 默认值改为"其他"
    quantity: "",
    price: "",
    photos: [] as string[],
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // 添加 HTMLSelectElement 类型
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      quantity: Number.parseInt(formData.quantity),
      price: Number.parseFloat(formData.price),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
              {initialData ? "编辑商品" : "添加商品"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                placeholder="请输入商品名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">品类</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                placeholder="请输入商品描述（可选）"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">库存</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">单价</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <PhotoUpload
              onUploadComplete={(urls) => setFormData((prev) => ({ ...prev, photos: urls }))}
              maxPhotos={5}
              existingPhotos={formData.photos}
            />

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
                {isSubmitting ? "保存中..." : initialData ? "更新" : "添加"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
