import { create } from "zustand"
import { createClient } from "./supabase/client"

export interface GiftItem {
  id: string
  gift_id: string
  item_name: string
  quantity: number
  unit_price: number
  subtotal: number
  category: string
}

export interface ReplyItem {
  id: string
  gift_id: string
  item_name: string
  category: string
  quantity: number
  unit_price: number
  subtotal: number
  inventory_id?: string
}

export interface Gift {
  id: string
  from_person: string
  from_company?: string
  gift_name: string
  category: string
  estimated_value: number
  received_date: string
  notes?: string
  status: "待回礼" | "已回礼"
  reply_item?: string
  reply_date?: string
  reply_cost?: number
  items?: GiftItem[]
  reply_items?: ReplyItem[]
  photos?: string[] // 添加照片数组字段
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  price: number
  description?: string
  source?: "manual" | "received"
  gift_id?: string
  photos?: string[] // 添加照片字段
}

export interface OutgoingGiftItem {
  id: string
  gift_id: string
  item_name: string
  category: string
  quantity: number
  unit_price: number
  subtotal: number
  inventory_id?: string
}

export interface OutgoingGift {
  id: string
  to_person: string
  to_company?: string
  send_date: string
  notes?: string
  total_cost: number
  items?: OutgoingGiftItem[]
  photos?: string[] // 添加照片字段
}

export interface Contact {
  id: string
  name: string
  phone?: string
  address?: string
  email?: string
  company?: string
  notes?: string
  age?: number
  gender?: "男" | "女" | "未知"
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  gift_id: string
  reminder_type: "待回礼" | "生日" | "节日" | "自定义"
  reminder_date: string
  message?: string
  is_completed: boolean
  created_at: string
}

interface SupabaseStore {
  gifts: Gift[]
  inventory: InventoryItem[]
  outgoingGifts: OutgoingGift[]
  contacts: Contact[]
  reminders: Reminder[] // 添加提醒列表
  loading: boolean

  // 礼物相关操作
  fetchGifts: () => Promise<void>
  addGift: (gift: Omit<Gift, "id">, items: Omit<GiftItem, "id" | "gift_id" | "subtotal">[]) => Promise<string>
  updateGift: (id: string, gift: Partial<Gift>) => Promise<void>
  deleteGift: (id: string) => Promise<void>
  replyToGift: (
    giftId: string,
    replyDate: string,
    replyItems: Omit<ReplyItem, "id" | "gift_id" | "subtotal">[],
  ) => Promise<void>
  deleteGifts: (ids: string[]) => Promise<void> // 批量删除礼物
  cancelReply: (giftId: string) => Promise<void> // 添加取消回礼功能

  // 库存相关操作
  fetchInventory: () => Promise<void>
  addInventory: (item: Omit<InventoryItem, "id">) => Promise<void>
  updateInventory: (id: string, item: Partial<InventoryItem>) => Promise<void>
  deleteInventory: (id: string) => Promise<void>
  deleteInventoryItems: (ids: string[]) => Promise<void> // 批量删除库存

  // 主动送礼相关操作
  fetchOutgoingGifts: () => Promise<void>
  addOutgoingGift: (
    gift: Omit<OutgoingGift, "id" | "total_cost">,
    items: Omit<OutgoingGiftItem, "id" | "gift_id" | "subtotal">[],
  ) => Promise<void>
  deleteOutgoingGift: (id: string) => Promise<void>
  deleteOutgoingGifts: (ids: string[]) => Promise<void> // 批量删除送礼记录

  // 联系人相关操作
  fetchContacts: () => Promise<void>
  addContact: (contact: Omit<Contact, "id" | "created_at" | "updated_at">) => Promise<void>
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>

  fetchReminders: () => Promise<void>
  addReminder: (reminder: Omit<Reminder, "id" | "created_at">) => Promise<void>
  updateReminder: (id: string, reminder: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  gifts: [],
  inventory: [],
  outgoingGifts: [],
  contacts: [],
  reminders: [], // 初始化提醒列表
  loading: false,

  fetchGifts: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from("gifts")
      .select("*, gift_items(*), reply_items(*)")
      .order("received_date", { ascending: false })

    if (!error && data) {
      const gifts = data.map((gift: any) => ({
        ...gift,
        estimated_value: Number(gift.estimated_value) || 0,
        reply_cost: gift.reply_cost ? Number(gift.reply_cost) : undefined,
        items:
          gift.gift_items?.map((item: any) => ({
            id: item.id,
            gift_id: item.gift_id,
            item_name: item.item_name,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
            category: item.category || "其他",
          })) || [],
        reply_items:
          gift.reply_items?.map((item: any) => ({
            id: item.id,
            gift_id: item.gift_id,
            item_name: item.item_name,
            category: item.category,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
            inventory_id: item.inventory_id,
          })) || [],
        photos: gift.photos || [], // 添加照片数组字段
      }))
      set({ gifts: gifts as Gift[] })
    }
    set({ loading: false })
  },

  addGift: async (gift, items) => {
    console.log("[v0] 添加礼物:", gift, "物品清单:", items)
    const supabase = createClient()

    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const giftWithTotal = { ...gift, estimated_value: totalValue }

    const { data, error } = await supabase.from("gifts").insert([giftWithTotal]).select().single()

    if (error) {
      console.error("[v0] Supabase 错误:", error)
      throw error
    }

    if (data) {
      console.log("[v0] 礼物添加成功:", data)

      const itemsWithGiftId = items.map((item) => ({
        gift_id: data.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        category: item.category,
      }))

      const { error: itemsError } = await supabase.from("gift_items").insert(itemsWithGiftId)

      if (itemsError) {
        console.error("[v0] 添加物品清单错误:", itemsError)
      }

      const cleanName = gift.from_person.trim()
      console.log("[v0] 检查联系人是否存在:", cleanName)

      const { data: existingContact } = await supabase.from("contacts").select("*").ilike("name", cleanName).single()

      if (!existingContact) {
        console.log("[v0] 联系人不存在，自动创建:", cleanName)
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert([
            {
              name: cleanName,
              company: gift.from_company || null,
              notes: `首次收礼时间: ${gift.received_date}`,
            },
          ])
          .select()
          .single()

        if (contactError) {
          console.error("[v0] 创建联系人失败:", contactError)
        } else {
          console.log("[v0] 联系人创建成功:", newContact)
        }
      } else {
        console.log("[v0] 联系人已存在，无需创建")
      }

      await get().fetchGifts()
      await get().fetchContacts()
      return data.id
    }
    throw new Error("未返回数据")
  },

  updateGift: async (id, gift) => {
    console.log("[v0] 更新礼物:", id, gift)
    const supabase = createClient()

    // 更新礼物数据
    const { error } = await supabase.from("gifts").update(gift).eq("id", id)

    if (error) {
      console.error("[v0] 更新礼物失败:", error)
      throw error
    }

    console.log("[v0] 更新成功，重新获取完整数据...")
    const { data, error: fetchError } = await supabase
      .from("gifts")
      .select("*, gift_items(*), reply_items(*)")
      .order("received_date", { ascending: false })

    if (!fetchError && data) {
      const gifts = data.map((gift: any) => ({
        ...gift,
        estimated_value: Number(gift.estimated_value) || 0,
        reply_cost: gift.reply_cost ? Number(gift.reply_cost) : undefined,
        items:
          gift.gift_items?.map((item: any) => ({
            id: item.id,
            gift_id: item.gift_id,
            item_name: item.item_name,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
            category: item.category || "其他",
          })) || [],
        reply_items:
          gift.reply_items?.map((item: any) => ({
            id: item.id,
            gift_id: item.gift_id,
            item_name: item.item_name,
            category: item.category,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
            inventory_id: item.inventory_id,
          })) || [],
        photos: gift.photos || [],
      }))

      // 强制更新状态，确保界面刷新
      set({ gifts: gifts as Gift[], loading: false })
      console.log("[v0] 状态已更新，新的礼物列表数量:", gifts.length)
      console.log(
        "[v0] 更新后的礼物:",
        gifts.find((g: any) => g.id === id),
      )
    }
  },

  deleteGift: async (id) => {
    const supabase = createClient()

    // 1. 查询该礼物关联的库存物品
    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("*")
      .eq("gift_id", id)
      .eq("source", "received")

    // 2. 删除这些库存物品（因为礼物被删除了，相关的库存也应该删除）
    if (inventoryItems && inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((item) => item.id)
      await supabase.from("inventory").delete().in("id", inventoryIds)

      // 更新本地状态
      set({ inventory: get().inventory.filter((i) => !inventoryIds.includes(i.id)) })
    }

    // 3. 删除礼物记录
    const { error } = await supabase.from("gifts").delete().eq("id", id)

    if (!error) {
      set({ gifts: get().gifts.filter((g) => g.id !== id) })
    }
  },

  replyToGift: async (giftId, replyDate, replyItems) => {
    const supabase = createClient()

    // 计算回礼总价值
    const totalCost = replyItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

    // 更新礼物状态
    await supabase
      .from("gifts")
      .update({
        status: "已回礼",
        reply_date: replyDate,
        reply_cost: totalCost,
      })
      .eq("id", giftId)

    const itemsWithGiftId = replyItems.map((item) => ({
      gift_id: giftId,
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inventory_id: item.inventory_id,
    }))

    await supabase.from("reply_items").insert(itemsWithGiftId)

    // 如果使用了库存，减少库存数量
    for (const item of replyItems) {
      if (item.inventory_id) {
        const inventoryItem = get().inventory.find((i) => i.id === item.inventory_id)
        if (inventoryItem) {
          await get().updateInventory(item.inventory_id, {
            quantity: inventoryItem.quantity - item.quantity,
          })
        }
      }
    }

    await get().fetchGifts()
  },

  fetchInventory: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false })

    if (!error && data) {
      const inventory = data.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        photos: item.photos || [], // 添加照片字段
      }))
      set({ inventory: inventory as InventoryItem[] })
    }
    set({ loading: false })
  },

  addInventory: async (item) => {
    console.log("[v0] 添加库存:", item)
    const supabase = createClient()
    const { data, error } = await supabase.from("inventory").insert([item]).select().single()

    if (error) {
      console.error("[v0] Supabase 库存错误:", error)
      throw error
    }

    if (data) {
      console.log("[v0] 库存添加成功:", data)
      set({ inventory: [data, ...get().inventory] })
    }
  },

  updateInventory: async (id, item) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("inventory").update(item).eq("id", id).select().single()

    if (!error && data) {
      set({
        inventory: get().inventory.map((i) => (i.id === id ? data : i)),
      })
    }
  },

  deleteInventory: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from("inventory").delete().eq("id", id)

    if (!error) {
      set({ inventory: get().inventory.filter((i) => i.id !== id) })
    }
  },

  deleteInventoryItems: async (ids) => {
    const supabase = createClient()
    const { error } = await supabase.from("inventory").delete().in("id", ids)

    if (!error) {
      set({ inventory: get().inventory.filter((i) => !ids.includes(i.id)) })
    }
  },

  fetchOutgoingGifts: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from("outgoing_gifts")
      .select("*, outgoing_gift_items(*)")
      .order("send_date", { ascending: false })

    if (!error && data) {
      const outgoingGifts = data.map((gift: any) => ({
        ...gift,
        total_cost: Number(gift.total_cost) || 0,
        photos: gift.photos || [], // 添加照片字段
        items:
          gift.outgoing_gift_items?.map((item: any) => ({
            id: item.id,
            gift_id: item.gift_id,
            item_name: item.item_name,
            category: item.category,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
            inventory_id: item.inventory_id,
          })) || [],
      }))
      set({ outgoingGifts: outgoingGifts as OutgoingGift[] })
    }
    set({ loading: false })
  },

  addOutgoingGift: async (gift, items) => {
    const supabase = createClient()

    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const giftWithTotal = { ...gift, total_cost: totalCost }

    const { data, error } = await supabase.from("outgoing_gifts").insert([giftWithTotal]).select().single()

    if (error) {
      console.error("[v0] 添加主动送礼错误:", error)
      throw error
    }

    if (data) {
      const itemsWithGiftId = items.map((item) => ({
        gift_id: data.id,
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        inventory_id: item.inventory_id,
      }))

      await supabase.from("outgoing_gift_items").insert(itemsWithGiftId)

      const cleanName = gift.to_person.trim()
      console.log("[v0] 检查收礼人联系人是否存在:", cleanName)

      const { data: existingContact } = await supabase.from("contacts").select("*").ilike("name", cleanName).single()

      if (!existingContact) {
        console.log("[v0] 联系人不存在，自动创建:", cleanName)
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert([
            {
              name: cleanName,
              company: gift.to_company || null,
              notes: `首次送礼时间: ${gift.send_date}`,
            },
          ])
          .select()
          .single()

        if (contactError) {
          console.error("[v0] 创建联系人失败:", contactError)
        } else {
          console.log("[v0] 联系人创建成功:", newContact)
        }
      } else {
        console.log("[v0] 联系人已存在，无需创建")
      }

      // 处理库存扣减
      for (const item of items) {
        if (item.inventory_id) {
          const inventoryItem = get().inventory.find((i) => i.id === item.inventory_id)
          if (inventoryItem) {
            await get().updateInventory(item.inventory_id, {
              quantity: inventoryItem.quantity - item.quantity,
            })
          }
        }
      }

      await get().fetchOutgoingGifts()
      await get().fetchContacts()
    }
  },

  deleteOutgoingGift: async (id) => {
    const supabase = createClient()

    const gift = get().outgoingGifts.find((g) => g.id === id)
    if (gift && gift.items) {
      for (const item of gift.items) {
        if (item.inventory_id) {
          const inventoryItem = get().inventory.find((i) => i.id === item.inventory_id)
          if (inventoryItem) {
            await get().updateInventory(item.inventory_id, {
              quantity: inventoryItem.quantity + item.quantity,
            })
          }
        }
      }
    }

    const { error } = await supabase.from("outgoing_gifts").delete().eq("id", id)

    if (!error) {
      set({ outgoingGifts: get().outgoingGifts.filter((g) => g.id !== id) })
    }
  },

  deleteOutgoingGifts: async (ids) => {
    const supabase = createClient()

    // 先恢复库存
    for (const id of ids) {
      const gift = get().outgoingGifts.find((g) => g.id === id)
      if (gift && gift.items) {
        for (const item of gift.items) {
          if (item.inventory_id) {
            const inventoryItem = get().inventory.find((i) => i.id === item.inventory_id)
            if (inventoryItem) {
              await get().updateInventory(item.inventory_id, {
                quantity: inventoryItem.quantity + item.quantity,
              })
            }
          }
        }
      }
    }

    const { error } = await supabase.from("outgoing_gifts").delete().in("id", ids)

    if (!error) {
      set({ outgoingGifts: get().outgoingGifts.filter((g) => !ids.includes(g.id)) })
    }
  },

  fetchContacts: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false })

    if (!error && data) {
      set({ contacts: data as Contact[] })
    }
    set({ loading: false })
  },

  addContact: async (contact) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("contacts").insert([contact]).select().single()

    if (error) {
      console.error("[v0] 添加联系人错误:", error)
      throw error
    }

    if (data) {
      set({ contacts: [data, ...get().contacts] })
    }
  },

  updateContact: async (id, contact) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("contacts").update(contact).eq("id", id).select().single()

    if (!error && data) {
      set({
        contacts: get().contacts.map((c) => (c.id === id ? data : c)),
      })
    }
  },

  deleteContact: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from("contacts").delete().eq("id", id)

    if (!error) {
      set({ contacts: get().contacts.filter((c) => c.id !== id) })
    }
  },

  fetchReminders: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase.from("reminders").select("*").order("reminder_date", { ascending: true })

    if (!error && data) {
      set({ reminders: data as Reminder[] })
    }
    set({ loading: false })
  },

  addReminder: async (reminder) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("reminders").insert([reminder]).select().single()

    if (error) {
      console.error("[v0] 添加提醒错误:", error)
      throw error
    }

    if (data) {
      set({ reminders: [...get().reminders, data] })
    }
  },

  updateReminder: async (id, reminder) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("reminders").update(reminder).eq("id", id).select().single()

    if (!error && data) {
      set({
        reminders: get().reminders.map((r) => (r.id === id ? data : r)),
      })
    }
  },

  deleteReminder: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from("reminders").delete().eq("id", id)

    if (!error) {
      set({ reminders: get().reminders.filter((r) => r.id !== id) })
    }
  },

  deleteGifts: async (ids) => {
    const supabase = createClient()

    // 1. 查询所有关联的库存物品
    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("*")
      .in("gift_id", ids)
      .eq("source", "received")

    // 2. 删除这些库存物品
    if (inventoryItems && inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((item) => item.id)
      await supabase.from("inventory").delete().in("id", inventoryIds)

      // 更新本地状态
      set({ inventory: get().inventory.filter((i) => !inventoryIds.includes(i.id)) })
    }

    // 3. 删除礼物记录
    const { error } = await supabase.from("gifts").delete().in("id", ids)

    if (!error) {
      set({ gifts: get().gifts.filter((g) => !ids.includes(g.id)) })
    }
  },

  cancelReply: async (giftId) => {
    console.log("[v0] 取消回礼，礼物ID:", giftId)
    const supabase = createClient()

    // 1. 查询回礼物品清单
    const { data: replyItems, error: replyItemsError } = await supabase
      .from("reply_items")
      .select("*")
      .eq("gift_id", giftId)

    if (replyItemsError) {
      console.error("[v0] 查询回礼物品错误:", replyItemsError)
      throw replyItemsError
    }

    // 2. 恢复库存
    if (replyItems) {
      for (const item of replyItems) {
        if (item.inventory_id) {
          const inventoryItem = get().inventory.find((i) => i.id === item.inventory_id)
          if (inventoryItem) {
            console.log(`[v0] 恢复库存: ${item.item_name}, 数量: ${item.quantity}`)
            await get().updateInventory(item.inventory_id, {
              quantity: inventoryItem.quantity + item.quantity,
            })
          }
        }
      }
    }

    // 3. 删除回礼记录
    await supabase.from("reply_items").delete().eq("gift_id", giftId)

    // 4. 更新礼物状态为待回礼
    await supabase
      .from("gifts")
      .update({
        status: "待回礼",
        reply_date: null,
        reply_cost: null,
      })
      .eq("id", giftId)

    console.log("[v0] 取消回礼成功，库存已恢复")

    // 5. 刷新数据
    await get().fetchGifts()
    await get().fetchInventory()
  },
}))
