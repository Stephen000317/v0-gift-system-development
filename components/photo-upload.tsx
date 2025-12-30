"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PhotoUploadProps {
  onUploadComplete: (urls: string[]) => void
  maxPhotos?: number
  existingPhotos?: string[]
}

export function PhotoUpload({ onUploadComplete, maxPhotos = 5, existingPhotos = [] }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (photos.length + files.length > maxPhotos) {
      alert(`最多只能上传 ${maxPhotos} 张照片`)
      return
    }

    setIsUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} 不是图片文件`)
          continue
        }

        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} 文件过大，请选择小于 5MB 的图片`)
          continue
        }

        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `gift-photos/${fileName}`

        console.log("[v0] 开始上传文件:", fileName)

        const { data, error } = await supabase.storage.from("gifts").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (error) {
          console.error("[v0] 上传失败:", error)
          alert(`上传 ${file.name} 失败: ${error.message}`)
          continue
        }

        console.log("[v0] 上传成功:", data.path)

        const {
          data: { publicUrl },
        } = supabase.storage.from("gifts").getPublicUrl(filePath)

        console.log("[v0] 公开 URL:", publicUrl)

        uploadedUrls.push(publicUrl)
      }

      const newPhotos = [...photos, ...uploadedUrls]
      setPhotos(newPhotos)
      onUploadComplete(newPhotos)
      console.log("[v0] 照片上传完成，总数:", newPhotos.length)
    } catch (error) {
      console.error("[v0] 上传过程出错:", error)
      alert("上传失败，请重试")
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    onUploadComplete(newPhotos)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">礼物照片（最多 {maxPhotos} 张）</label>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url || "/placeholder.svg"}
                alt={`礼物照片 ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <label
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
              <p className="text-sm text-gray-500">上传中...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">点击上传照片</p>
              <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG，最大 5MB</p>
            </>
          )}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}

export default PhotoUpload
