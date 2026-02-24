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
  photos?: string[]
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
  photos?: string[]
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
  photos?: string[]
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
  reminders: Reminder[]
  loading: boolean

  fetchGifts: () => Promise<void>
  addGift: (gift: Omit<Gift, "id">, items: Omit<GiftItem, "id" | "gift_id" | "subtotal">[]) => Promise<string>
  updateGift: (id: string, gift: Partial<Gift>) => Promise<void>
  deleteGift: (id: string) => Promise<void>
  replyToGift: (
    giftId: string,
    replyDate: string,
    replyItems: Omit<ReplyItem, "id" | "gift_id" | "subtotal">[],
  ) => Promise<void>
  deleteGifts: (ids: string[]) => Promise<void>
  cancelReply: (giftId: string) => Promise<void>

  fetchInventory: () => Promise<void>
  addInventory: (item: Omit<InventoryItem, "id">) => Promise<void>
  updateInventory: (id: string, item: Partial<InventoryItem>) => Promise<void>
  deleteInventory: (id: string) => Promise<void>
  deleteInventoryItems: (ids: string[]) => Promise<void>

  fetchOutgoingGifts: () => Promise<void>
  addOutgoingGift: (
    gift: Omit<OutgoingGift, "id" | "total_cost">,
    items: Omit<OutgoingGiftItem, "id" | "gift_id" | "subtotal">[],
  ) => Promise<void>
  updateOutgoingGift: (
    id: string,
    gift: Partial<OutgoingGift>,
    items: Omit<OutgoingGiftItem, "id" | "gift_id" | "subtotal">[],
  ) => Promise<void>
  deleteOutgoingGift: (id: string) => Promise<void>
  deleteOutgoingGifts: (ids: string[]) => Promise<void>

  fetchContacts: () => Promise<void>
  addContact: (contact: Omit<Contact, "id" | "created_at" | "updated_at">) => Promise<void>
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>

  fetchReminders: () => Promise<void>
  addReminder: (reminder: Omit<Reminder, "id" | "created_at">) => Promise<void>
  updateReminder: (id: string, reminder: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
}

// 从数据库获取最新库存数量后原子性扣减，避免并发竞态条件
async function safeDecrementInventory(
  supabase: ReturnType<typeof createClient>,
  inventoryId: string,
  amount: number,
  get: () => SupabaseStore,
  set: (state: Partial<SupabaseStore>) => void,
) {
  const { data: freshItem } = await supabase
    .from("inventory")
    .select("quantity")
    .eq("id", inventoryId)
    .single()
  if (!freshItem) return
  const newQty = Math.max(0, freshItem.quantity - amount)
  const { data, error } = await supabase
    .from("inventory")
    .update({ quantity: newQty })
    .eq("id", inventoryId)
    .select()
    .single()
  if (!error && data) {
    set({ inventory: get().inventory.map((i) => (i.id === inventoryId ? data : i)) })
  }
}

async function safeIncrementInventory(
  supabase: ReturnType<typeof createClient>,
  inventoryId: string,
  amount: number,
  get: () => SupabaseStore,
  set: (state: Partial<SupabaseStore>) => void,
) {
  const { data: freshItem } = await supabase
    .from("inventory")
    .select("quantity")
    .eq("id", inventoryId)
    .single()
  if (!freshItem) return
  const newQty = freshItem.quantity + amount
  const { data, error } = await supabase
    .from("inventory")
    .update({ quantity: newQty })
    .eq("id", inventoryId)
    .select()
    .single()
  if (!error && data) {
    set({ inventory: get().inventory.map((i) => (i.id === inventoryId ? data : i)) })
  }
}

const mapGift = (gift: any): Gift => ({
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
})

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  gifts: [],
  inventory: [],
  outgoingGifts: [],
  contacts: [],
  reminders: [],
  loading: false,

  fetchGifts: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from("gifts")
      .select("*, gift_items(*), reply_items(*)")
      .order("received_date", { ascending: false })

    if (!error && data) {
      set({ gifts: data.map(mapGift) as Gift[] })
    }
    set({ loading: false })
  },

  addGift: async (gift, items) => {
    const supabase = createClient()

    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const giftWithTotal = { ...gift, estimated_value: totalValue }

    const { data, error } = await supabase.from("gifts").insert([giftWithTotal]).select().single()
    if (error) throw error

    if (data) {
      const itemsWithGiftId = items.map((item) => ({
        gift_id: data.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        category: item.category,
      }))
      await supabase.from("gift_items").insert(itemsWithGiftId)

      const cleanName = gift.from_person.trim()
      const { data: existingContact } = await supabase.from("contacts").select("id").ilike("name", cleanName).single()
      if (!existingContact) {
        await supabase.from("contacts").insert([
          {
            name: cleanName,
            company: gift.from_company || null,
            notes: `首次收礼时间: ${gift.received_date}`,
          },
        ])
      }

      await get().fetchGifts()
      await get().fetchContacts()
      return data.id
    }
    throw new Error("未返回数据")
  },

  updateGift: async (id, gift) => {
    const supabase = createClient()
    const { error } = await supabase.from("gifts").update(gift).eq("id", id)
    if (error) throw error

    const { data, error: fetchError } = await supabase
      .from("gifts")
      .select("*, gift_items(*), reply_items(*)")
      .order("received_date", { ascending: false })

    if (!fetchError && data) {
      set({ gifts: data.map(mapGift) as Gift[], loading: false })
    }
  },

  deleteGift: async (id) => {
    const supabase = createClient()

    // 先删除礼物记录，再清理关联库存（避免库存删了但礼物还在的情况）
    const { error } = await supabase.from("gifts").delete().eq("id", id)
    if (error) throw error

    set({ gifts: get().gifts.filter((g) => g.id !== id) })

    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("id")
      .eq("gift_id", id)
      .eq("source", "received")

    if (inventoryItems && inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((item) => item.id)
      await supabase.from("inventory").delete().in("id", inventoryIds)
      set({ inventory: get().inventory.filter((i) => !inventoryIds.includes(i.id)) })
    }
  },

  replyToGift: async (giftId, replyDate, replyItems) => {
    const supabase = createClient()

    const totalCost = replyItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

    await supabase
      .from("gifts")
      .update({ status: "已回礼", reply_date: replyDate, reply_cost: totalCost })
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

    // 使用数据库最新值扣减，避免并发竞态
    for (const item of replyItems) {
      if (item.inventory_id) {
        await safeDecrementInventory(supabase, item.inventory_id, item.quantity, get, set)
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
        photos: item.photos || [],
      }))
      set({ inventory: inventory as InventoryItem[] })
    }
    set({ loading: false })
  },

  addInventory: async (item) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("inventory").insert([item]).select().single()
    if (error) throw error
    if (data) {
      set({ inventory: [data, ...get().inventory] })
    }
  },

  updateInventory: async (id, item) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("inventory").update(item).eq("id", id).select().single()
    if (!error && data) {
      set({ inventory: get().inventory.map((i) => (i.id === id ? data : i)) })
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
        photos: gift.photos || [],
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
    const { data, error } = await supabase
      .from("outgoing_gifts")
      .insert([{ ...gift, total_cost: totalCost }])
      .select()
      .single()
    if (error) throw error

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
      const { data: existingContact } = await supabase.from("contacts").select("id").ilike("name", cleanName).single()
      if (!existingContact) {
        await supabase.from("contacts").insert([
          {
            name: cleanName,
            company: gift.to_company || null,
            notes: `首次送礼时间: ${gift.send_date}`,
          },
        ])
      }

      // 使用数据库最新值扣减，避免并发竞态
      for (const item of items) {
        if (item.inventory_id) {
          await safeDecrementInventory(supabase, item.inventory_id, item.quantity, get, set)
        }
      }

      await get().fetchOutgoingGifts()
      await get().fetchContacts()
    }
  },

  updateOutgoingGift: async (id, gift, items) => {
    const supabase = createClient()

    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const { error } = await supabase.from("outgoing_gifts").update({ ...gift, total_cost: totalCost }).eq("id", id)
    if (error) throw error

    await supabase.from("outgoing_gift_items").delete().eq("gift_id", id)

    const itemsWithGiftId = items.map((item) => ({
      gift_id: id,
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inventory_id: item.inventory_id,
    }))
    await supabase.from("outgoing_gift_items").insert(itemsWithGiftId)

    await get().fetchOutgoingGifts()
  },

  deleteOutgoingGift: async (id) => {
    const supabase = createClient()

    const gift = get().outgoingGifts.find((g) => g.id === id)
    const { error } = await supabase.from("outgoing_gifts").delete().eq("id", id)
    if (error) throw error

    set({ outgoingGifts: get().outgoingGifts.filter((g) => g.id !== id) })

    // 删除后再恢复库存（使用数据库最新值）
    if (gift?.items) {
      for (const item of gift.items) {
        if (item.inventory_id) {
          await safeIncrementInventory(supabase, item.inventory_id, item.quantity, get, set)
        }
      }
    }
  },

  deleteOutgoingGifts: async (ids) => {
    const supabase = createClient()

    const giftsToDelete = get().outgoingGifts.filter((g) => ids.includes(g.id))
    const { error } = await supabase.from("outgoing_gifts").delete().in("id", ids)
    if (error) throw error

    set({ outgoingGifts: get().outgoingGifts.filter((g) => !ids.includes(g.id)) })

    for (const gift of giftsToDelete) {
      if (gift.items) {
        for (const item of gift.items) {
          if (item.inventory_id) {
            await safeIncrementInventory(supabase, item.inventory_id, item.quantity, get, set)
          }
        }
      }
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
    if (error) throw error
    if (data) {
      set({ contacts: [data, ...get().contacts] })
    }
  },

  updateContact: async (id, contact) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("contacts").update(contact).eq("id", id).select().single()
    if (!error && data) {
      set({ contacts: get().contacts.map((c) => (c.id === id ? data : c)) })
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
    if (error) throw error
    if (data) {
      set({ reminders: [...get().reminders, data] })
    }
  },

  updateReminder: async (id, reminder) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("reminders").update(reminder).eq("id", id).select().single()
    if (!error && data) {
      set({ reminders: get().reminders.map((r) => (r.id === id ? data : r)) })
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

    // 先删礼物，再清理关联库存
    const { error } = await supabase.from("gifts").delete().in("id", ids)
    if (error) throw error

    set({ gifts: get().gifts.filter((g) => !ids.includes(g.id)) })

    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("id")
      .in("gift_id", ids)
      .eq("source", "received")

    if (inventoryItems && inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((item) => item.id)
      await supabase.from("inventory").delete().in("id", inventoryIds)
      set({ inventory: get().inventory.filter((i) => !inventoryIds.includes(i.id)) })
    }
  },

  cancelReply: async (giftId) => {
    const supabase = createClient()

    const { data: replyItems, error: replyItemsError } = await supabase
      .from("reply_items")
      .select("*")
      .eq("gift_id", giftId)

    if (replyItemsError) throw replyItemsError

    // 恢复库存（使用数据库最新值）
    if (replyItems) {
      for (const item of replyItems) {
        if (item.inventory_id) {
          await safeIncrementInventory(supabase, item.inventory_id, item.quantity, get, set)
        }
      }
    }

    await supabase.from("reply_items").delete().eq("gift_id", giftId)
    await supabase
      .from("gifts")
      .update({ status: "待回礼", reply_date: null, reply_cost: null })
      .eq("id", giftId)

    await get().fetchGifts()
    await get().fetchInventory()
  },
}))
