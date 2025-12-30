import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Gift {
  id: string
  from: string
  description: string
  category: string
  value: number
  date: string
  status: "pending" | "replied"
  replyDate?: string
  replyItem?: string
  replyCost?: number
}

interface InventoryItem {
  id: string
  name: string
  description: string
  stock: number
  price: number
  minStock: number
  source?: "received" | "purchased" // 添加来源字段以区分接收或购买的礼物
  giftId?: string // 关联礼物ID
}

interface GiftStore {
  gifts: Gift[]
  addGift: (gift: Omit<Gift, "id">) => string
  deleteGift: (id: string) => void
  updateGift: (id: string, updates: Partial<Gift>) => void
}

interface InventoryStore {
  items: InventoryItem[]
  addItem: (item: Omit<InventoryItem, "id">) => void
  deleteItem: (id: string) => void
  updateItem: (id: string, updates: Partial<InventoryItem>) => void
  decreaseStock: (id: string, quantity: number) => void // 添加减少库存数量的方法
}

export const useGiftStore = create<GiftStore>()(
  persist(
    (set) => ({
      gifts: [],
      addGift: (gift) => {
        const id = Date.now().toString()
        set((state) => ({
          gifts: [...state.gifts, { ...gift, id }],
        }))
        return id
      },
      deleteGift: (id) =>
        set((state) => ({
          gifts: state.gifts.filter((g) => g.id !== id),
        })),
      updateGift: (id, updates) =>
        set((state) => ({
          gifts: state.gifts.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
    }),
    {
      name: "gift-store",
    },
  ),
)

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: Date.now().toString() }],
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      decreaseStock: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, stock: Math.max(0, i.stock - quantity) } : i)),
        })), // 实现减少库存数量的方法
    }),
    {
      name: "inventory-store",
    },
  ),
)
