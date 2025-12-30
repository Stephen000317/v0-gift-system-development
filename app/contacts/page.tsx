"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Users, Gift, Send, Search, Plus, Phone, Mail, MapPin, Building, Pencil, Trash2, X } from "lucide-react"
import { useSupabaseStore } from "@/lib/supabase-store"
import type { Contact } from "@/lib/supabase-store"

interface ContactStats {
  contact: Contact
  contactGroup: Contact[]
  receivedCount: number
  receivedValue: number
  sentCount: number
  sentValue: number
  repliedCount: number
  pendingCount: number
  balance: number
}

export default function ContactsPage() {
  const {
    contacts,
    gifts,
    outgoingGifts,
    fetchContacts,
    fetchGifts,
    fetchOutgoingGifts,
    addContact,
    updateContact,
    deleteContact,
  } = useSupabaseStore()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    company: "",
    notes: "",
    age: "",
    gender: "未知" as "男" | "女" | "未知",
  })

  useEffect(() => {
    setMounted(true)
    fetchContacts()
    fetchGifts()
    fetchOutgoingGifts()
  }, [fetchContacts, fetchGifts, fetchOutgoingGifts])

  const contactStats = useMemo(() => {
    if (!mounted) return []

    // 按姓名分组联系人（大小写和空格不敏感）
    const contactsByName = new Map<string, typeof contacts>()

    contacts.forEach((contact) => {
      const cleanName = contact.name.trim().toLowerCase()
      if (!contactsByName.has(cleanName)) {
        contactsByName.set(cleanName, [])
      }
      contactsByName.get(cleanName)!.push(contact)
    })

    // 为每个唯一的姓名生成统计数据
    return Array.from(contactsByName.entries()).map(([cleanName, contactGroup]) => {
      // 使用第一个联系人作为代表
      const contact = contactGroup[0]

      // 合并所有同名联系人的信息
      const allNames = contactGroup.map((c) => c.name)
      const receivedGifts = gifts.filter((g) =>
        allNames.some((name) => g.from_person.trim().toLowerCase() === name.toLowerCase()),
      )
      const sentGifts = outgoingGifts.filter((g) =>
        allNames.some((name) => g.to_person.trim().toLowerCase() === name.toLowerCase()),
      )

      const receivedValue = receivedGifts.reduce((sum, g) => sum + (Number(g.estimated_value) || 0), 0)
      const sentValue = sentGifts.reduce((sum, g) => sum + g.total_cost, 0)
      const repliedCount = receivedGifts.filter((g) => g.status === "已回礼").length
      const pendingCount = receivedGifts.filter((g) => g.status === "待回礼").length

      return {
        contact,
        contactGroup, // 保存所有同名联系人
        receivedCount: receivedGifts.length,
        receivedValue,
        sentCount: sentGifts.length,
        sentValue,
        repliedCount,
        pendingCount,
        balance: receivedValue - sentValue,
      }
    })
  }, [contacts, gifts, outgoingGifts, mounted])

  const filteredContacts = contactStats.filter((stat) =>
    stat.contact.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const selectedContactData = selectedContact ? filteredContacts.find((c) => c.contact.id === selectedContact) : null
  const selectedReceivedGifts = selectedContactData
    ? gifts.filter((g) => {
        const allNames = selectedContactData.contactGroup.map((c) => c.name)
        return allNames.some((name) => g.from_person.trim().toLowerCase() === name.toLowerCase())
      })
    : []
  const selectedSentGifts = selectedContactData
    ? outgoingGifts.filter((g) => {
        const allNames = selectedContactData.contactGroup.map((c) => c.name)
        return allNames.some((name) => g.to_person.trim().toLowerCase() === name.toLowerCase())
      })
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      if (editingContact) {
        await updateContact(editingContact.id, formData)
      } else {
        await addContact(formData)
      }
      setShowForm(false)
      setEditingContact(null)
      setFormData({ name: "", phone: "", address: "", email: "", company: "", notes: "", age: "", gender: "未知" })
    } catch (error) {
      console.error("保存联系人失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      phone: contact.phone || "",
      address: contact.address || "",
      email: contact.email || "",
      company: contact.company || "",
      notes: contact.notes || "",
      age: contact.age || "",
      gender: contact.gender || "未知",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个联系人吗？")) {
      await deleteContact(id)
      if (selectedContact === id) {
        setSelectedContact(null)
      }
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent mb-2 tracking-tight">
              联系人管理
            </h1>
            <p className="text-gray-600 text-lg">共 {contacts.length} 位联系人</p>
          </div>
          <button
            onClick={() => {
              setEditingContact(null)
              setFormData({
                name: "",
                phone: "",
                address: "",
                email: "",
                company: "",
                notes: "",
                age: "",
                gender: "未知",
              })
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#A02935] hover:to-[#750000] text-white rounded-xl font-medium transition-all shadow-md hover:shadow-[0_8px_30px_rgb(184,50,63,0.3)]"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">新建联系人</span>
          </button>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索联系人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#D4AF37]/30 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#B8323F] transition-colors"
            />
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-32">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-gray-50 rounded-3xl">
                <Users className="w-16 h-16 text-gray-300" />
              </div>
            </div>
            <p className="text-gray-400 text-xl mb-4">{searchTerm ? "没有找到匹配的联系人" : "还没有联系人"}</p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">创建第一个联系人</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {filteredContacts.map((stat) => (
                <div
                  key={stat.contact.id}
                  onClick={() => setSelectedContact(stat.contact.id)}
                  className={`p-6 bg-white rounded-2xl border-2 cursor-pointer transition-all hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] ${
                    selectedContact === stat.contact.id
                      ? "border-[#B8323F]"
                      : "border-[#D4AF37]/20 hover:border-[#D4AF37]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-1">{stat.contact.name}</h3>
                      {stat.contact.company && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {stat.contact.company}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(stat.contact)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(stat.contact.id)
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {(stat.contact.phone || stat.contact.email) && (
                    <div className="mb-4 space-y-1 text-sm text-gray-600">
                      {stat.contact.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {stat.contact.phone}
                        </p>
                      )}
                      {stat.contact.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {stat.contact.email}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">收到礼物</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stat.receivedCount} 份 · ¥{stat.receivedValue.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">送出礼物</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stat.sentCount} 份 · ¥{stat.sentValue.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {stat.balance !== 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {stat.balance > 0 ? (
                        <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-600 font-medium inline-block">
                          收礼多 +¥{stat.balance.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-600 font-medium inline-block">
                          送礼多 -¥{Math.abs(stat.balance).toFixed(0)}
                        </span>
                      )}
                    </div>
                  )}
                  {stat.pendingCount > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-orange-600 font-medium">待回礼 {stat.pendingCount} 份</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="sticky top-24 h-fit">
              {selectedContactData ? (
                <div className="p-8 bg-white rounded-3xl border-2 border-[#D4AF37]/30">
                  <h2 className="text-3xl font-semibold bg-gradient-to-r from-[#B8323F] to-[#D4AF37] bg-clip-text text-transparent mb-2">
                    {selectedContactData.contact.name}
                  </h2>

                  <div className="mb-6 space-y-2 text-sm">
                    {selectedContactData.contact.phone && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {selectedContactData.contact.phone}
                      </p>
                    )}
                    {selectedContactData.contact.email && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {selectedContactData.contact.email}
                      </p>
                    )}
                    {selectedContactData.contact.address && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {selectedContactData.contact.address}
                      </p>
                    )}
                    {selectedContactData.contact.company && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Building className="w-4 h-4" />
                        {selectedContactData.contact.company}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gradient-to-br from-[#FAF7F0] to-white rounded-xl border border-[#D4AF37]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-blue-500" />
                        <p className="text-sm text-gray-600">收到</p>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900">{selectedContactData.receivedCount}</p>
                      <p className="text-sm text-gray-500">¥{selectedContactData.receivedValue.toFixed(0)}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-[#FAF7F0] to-white rounded-xl border border-[#D4AF37]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="w-5 h-5 text-purple-500" />
                        <p className="text-sm text-gray-600">送出</p>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900">{selectedContactData.sentCount}</p>
                      <p className="text-sm text-gray-500">¥{selectedContactData.sentValue.toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedReceivedGifts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">收到的礼物</h3>
                        <div className="space-y-2">
                          {selectedReceivedGifts.map((gift) => (
                            <div key={gift.id} className="p-4 bg-white rounded-xl">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  {gift.items && gift.items.length > 0 ? (
                                    <div className="space-y-2">
                                      {gift.items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                                              {item.category}
                                            </span>
                                            <span className="font-medium text-gray-900">{item.item_name}</span>
                                          </div>
                                          <div className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-500">
                                              数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                            </span>
                                            <span className="text-gray-500">
                                              单价 <span className="font-medium text-gray-900">¥{item.unit_price}</span>
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="font-medium text-gray-900">{gift.gift_name}</p>
                                  )}
                                </div>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ml-3 ${
                                    gift.status === "待回礼"
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-green-100 text-green-600"
                                  }`}
                                >
                                  {gift.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(gift.received_date).toLocaleDateString("zh-CN")} · ¥{gift.estimated_value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedSentGifts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">送出的礼物</h3>
                        <div className="space-y-2">
                          {selectedSentGifts.map((gift) => (
                            <div key={gift.id} className="p-4 bg-white rounded-xl">
                              <div className="mb-2">
                                {gift.items && gift.items.length > 0 ? (
                                  <div className="space-y-2">
                                    {gift.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                                            {item.category}
                                          </span>
                                          <span className="font-medium text-gray-900">{item.item_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                          <span className="text-gray-500">
                                            数量 <span className="font-medium text-gray-900">{item.quantity}</span>
                                          </span>
                                          <span className="text-gray-500">
                                            单价 <span className="font-medium text-gray-900">¥{item.unit_price}</span>
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="font-medium text-gray-900">礼物</p>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(gift.send_date).toLocaleDateString("zh-CN")} · ¥{gift.total_cost}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-16 bg-white rounded-3xl text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400">选择联系人查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-semibold text-gray-900">{editingContact ? "编辑联系人" : "新建联系人"}</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingContact(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">年龄</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "")
                    setFormData({ ...formData, age: value })
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入年龄"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">性别</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as "男" | "女" | "未知" })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                >
                  <option value="未知">未知</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入电话号码"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入公司名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">地址</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="请输入备注信息"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingContact(null)
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#B8323F] to-[#8B0000] hover:from-[#A02935] hover:to-[#750000] text-white rounded-xl font-medium transition-all shadow-md hover:shadow-[0_8px_30px_rgb(184,50,63,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "保存中..." : editingContact ? "保存" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
