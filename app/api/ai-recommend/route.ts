import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { giftId } = await request.json()
    const supabase = await createClient()

    // 获取礼物详情
    const { data: gift, error: giftError } = await supabase.from("gifts").select("*").eq("id", giftId).single()

    if (giftError || !gift) {
      return NextResponse.json({ error: "礼物不存在" }, { status: 404 })
    }

    // 获取礼物项目
    const { data: giftItems } = await supabase.from("gift_items").select("*").eq("gift_id", giftId)

    // 根据送礼人姓名查找联系人信息
    let contact = null
    if (gift.from_person) {
      const { data: contactData } = await supabase
        .from("contacts")
        .select("*")
        .eq("name", gift.from_person)
        .limit(1)
        .single()

      contact = contactData
    }

    let historyGifts = []
    let historyReplies = []
    if (gift.from_person) {
      // 查找该送礼人的所有往来记录
      const { data: receivedHistory } = await supabase
        .from("gifts")
        .select("*, gift_items(*)")
        .eq("from_person", gift.from_person)
        .order("received_date", { ascending: false })
        .limit(5)

      historyGifts = receivedHistory || []

      // 查找给该送礼人的所有主动送礼记录
      const { data: sentHistory } = await supabase
        .from("outgoing_gifts")
        .select("*, outgoing_gift_items(*)")
        .eq("to_person", gift.from_person)
        .order("send_date", { ascending: false })
        .limit(5)

      historyReplies = sentHistory || []
    }

    // 获取库存
    const { data: inventory } = await supabase.from("inventory").select("*").gt("quantity", 0)

    // 组装数据
    const giftWithDetails = {
      ...gift,
      gift_items: giftItems || [],
      contact: contact,
      history: {
        received: historyGifts,
        sent: historyReplies,
      },
    }

    const recommendations = await generateAIRecommendations(giftWithDetails, inventory || [])

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("[v0] 智能推荐错误:", error)
    return NextResponse.json({ error: "推荐失败" }, { status: 500 })
  }
}

function getNearbyHolidays() {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const holidays = []

  // 春节（1月-2月，农历正月初一，简化为公历1月20日-2月20日）
  if ((month === 1 && day >= 20) || (month === 2 && day <= 20)) {
    holidays.push("春节")
  }

  // 元宵节（农历正月十五，简化为公历2月1日-28日）
  if (month === 2) {
    holidays.push("元宵节")
  }

  // 清明节（4月4-6日）
  if (month === 4 && day >= 4 && day <= 6) {
    holidays.push("清明节")
  }

  // 端午节（农历五月初五，简化为公历5月-6月）
  if (month === 5 || month === 6) {
    holidays.push("端午节")
  }

  // 中秋节（农历八月十五，简化为公历9月）
  if (month === 9) {
    holidays.push("中秋节")
  }

  // 国庆节（10月1-7日）
  if (month === 10 && day >= 1 && day <= 7) {
    holidays.push("国庆节")
  }

  // 圣诞节（12月25日前后）
  if (month === 12 && day >= 20 && day <= 31) {
    holidays.push("圣诞节")
  }

  return holidays
}

async function generateAIRecommendations(gift: any, inventory: any[]) {
  const contact = gift.contact
  const giftItems = gift.gift_items || []
  const totalValue = giftItems.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
  const history = gift.history || { received: [], sent: [] }

  // 准备礼物信息
  const giftInfo = giftItems
    .map((item: any) => `${item.category} - ${item.item_name} x${item.quantity} (¥${item.unit_price})`)
    .join(", ")

  // 准备联系人信息
  const contactInfo = contact
    ? `姓名: ${contact.name}, 性别: ${contact.gender || "未知"}, 年龄: ${contact.age || "未知"}, 公司: ${contact.company || "未知"}`
    : "联系人信息未知"

  const receivedHistory =
    history.received.length > 0
      ? history.received
          .map((h: any, idx: number) => {
            const items = h.gift_items || []
            const itemsText = items.map((i: any) => `${i.item_name}(¥${i.unit_price})`).join(", ")
            return `${idx + 1}. ${h.received_date}: 收到 ${itemsText}`
          })
          .join("\n")
      : "无历史记录"

  const sentHistory =
    history.sent.length > 0
      ? history.sent
          .map((h: any, idx: number) => {
            const items = h.outgoing_gift_items || []
            const itemsText = items.map((i: any) => `${i.item_name}(¥${i.unit_price})`).join(", ")
            return `${idx + 1}. ${h.send_date}: 送出 ${itemsText}`
          })
          .join("\n")
      : "无送礼记录"

  // 准备库存信息
  const inventoryInfo = inventory
    .map((item: any) => `${item.category} - ${item.name} (¥${item.unit_price}, 库存${item.quantity})`)
    .join("\n")

  const month = new Date().getMonth() + 1
  const season =
    month >= 3 && month <= 5 ? "春季" : month >= 6 && month <= 8 ? "夏季" : month >= 9 && month <= 11 ? "秋季" : "冬季"
  const nearbyHolidays = getNearbyHolidays()
  const holidayInfo = nearbyHolidays.length > 0 ? `即将到来的节日: ${nearbyHolidays.join("、")}` : "无特殊节日"

  const prompt = `你是一个专业的中国礼物推荐专家，精通中国送礼文化和人情世故。请根据以下信息，生成5个智能回礼推荐方案。

## 当前收到的礼物
- 礼物清单: ${giftInfo}
- 总价值: ¥${totalValue}
- 送礼人: ${contactInfo}

## 历史往来记录
### 从该送礼人收到的礼物历史:
${receivedHistory}

### 曾经送给该送礼人的礼物:
${sentHistory}

## 时令信息
- 当前季节: ${season}
- ${holidayInfo}

## 可用库存
${inventoryInfo}

## 中国送礼文化要点
1. 礼尚往来要对等，但不能完全相同
2. 避免重复送过的礼物（除非是消耗品）
3. 节日要结合节日文化选择礼物
4. 年龄、性别、关系要考虑周到
5. 避免送礼禁忌（如钟表、鞋子等）

## 要求
1. 生成5个不同策略的推荐方案，策略包括：
   - 等价回礼（价值相当）
   - 品类升级（更好的品类）
   - 节日特色（结合当前节日）
   - 个性化推荐（基于年龄性别）
   - 创新组合（多件搭配）

2. 每个方案包含：
   - title: 推荐方案标题（如"春节特色回礼"、"品质升级方案"）
   - reason: 推荐理由（100-150字，结合历史记录、节日、文化等因素，说明为什么这样推荐）
   - suggestedValue: 建议回礼总价值
   - matchScore: 匹配度评分（85-98分）
   - culturalNote: 文化提示（如节日寓意、送礼讲究等，50字以内）
   - items: 推荐的商品列表（从库存中选择，每个方案1-3件商品）
     - name: 商品名称（必须与库存完全一致）
     - category: 品类
     - quantity: 数量
     - unit_price: 单价
     - total: 小计

3. 注意事项：
   - 推荐的商品名称必须从库存中选择，名称完全一致
   - 数量不能超过库存数量
   - 避免推荐历史上送过的同类商品（除非是消耗品）
   - 如果有节日，优先考虑节日特色礼物
   - 推荐理由要具体，引用历史数据和文化背景

请以JSON格式返回：
[
  {
    "title": "春节特色回礼",
    "reason": "根据往来记录，您之前收到过对方的茅台酒，这次可以回赠高端茶叶，体现品味升级。恰逢春节临近，茶叶寓意清雅高洁，适合节日氛围。",
    "suggestedValue": 1000,
    "matchScore": 95,
    "culturalNote": "春节送茶叶寓意清雅祥和，新年好兆头",
    "items": [
      {
        "name": "大红袍",
        "category": "茶叶",
        "quantity": 2,
        "unit_price": 500,
        "total": 1000
      }
    ]
  }
]`

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API 错误: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices[0]?.message?.content || ""

    console.log("[v0] Groq AI 原始响应:", text)

    // 解析 AI 返回的 JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("AI 返回格式错误")
    }

    const recommendations = JSON.parse(jsonMatch[0])
    return recommendations
  } catch (error) {
    console.error("[v0] Groq AI 调用失败:", error)
    // 如果 AI 调用失败，返回基础算法推荐作为备用
    return generateBasicRecommendations(gift, inventory)
  }
}

function generateBasicRecommendations(gift: any, inventory: any[]) {
  const giftItems = gift.gift_items || []
  const totalValue = giftItems.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)

  return [
    {
      title: "等价回礼",
      reason: `建议回礼价值在 ¥${Math.floor(totalValue * 0.9)}-¥${Math.ceil(totalValue * 1.1)} 之间`,
      suggestedValue: totalValue,
      matchScore: 85,
      culturalNote: "礼尚往来，价值对等",
      items: inventory.slice(0, 3).map((item) => ({
        name: item.name,
        category: item.category,
        quantity: 1,
        unit_price: item.unit_price,
        total: item.unit_price,
      })),
    },
  ]
}
