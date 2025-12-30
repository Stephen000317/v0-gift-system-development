import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory } = await req.json()
    const supabase = await createClient()

    console.log("[v0] AI聊天收到消息:", message)

    // 分析用户意图
    const intent = analyzeIntent(message)
    console.log("[v0] 分析意图:", intent)

    // 根据意图查询相关数据
    let contextData = ""
    let giftData: any = null
    let contactData: any = null
    let inventoryData: any = null
    let outgoingData: any = null

    // 查询收到的礼物数据
    if (intent.needsGiftData || intent.personName) {
      let query = supabase.from("gifts").select("*, gift_items(*)")

      // 如果提到具体人名，按人名过滤
      if (intent.personName) {
        query = query.or(`from_person.ilike.%${intent.personName}%`)
      }

      const { data: gifts, error } = await query.order("received_date", { ascending: false }).limit(50)

      if (error) {
        console.error("[v0] 查询礼物错误:", error)
      } else {
        giftData = gifts
        console.log("[v0] 查询到礼物数据:", gifts?.length, "条")
      }
    }

    // 查询联系人数据
    if (intent.needsContactData || intent.personName) {
      let query = supabase.from("contacts").select("*")

      if (intent.personName) {
        query = query.ilike("name", `%${intent.personName}%`)
      }

      const { data: contacts, error } = await query.limit(100)

      if (error) {
        console.error("[v0] 查询联系人错误:", error)
      } else {
        contactData = contacts
        console.log("[v0] 查询到联系人数据:", contacts?.length, "条")
      }
    }

    // 查询库存数据
    if (intent.needsInventoryData) {
      const { data: inventory, error } = await supabase
        .from("inventory")
        .select("*")
        .order("quantity", { ascending: false })

      if (error) {
        console.error("[v0] 查询库存错误:", error)
      } else {
        inventoryData = inventory
        console.log("[v0] 查询到库存数据:", inventory?.length, "条")
      }
    }

    // 查询送出的礼物数据
    if (intent.needsOutgoingData || intent.personName) {
      let query = supabase.from("outgoing_gifts").select("*, outgoing_gift_items(*)")

      if (intent.personName) {
        query = query.or(`to_person.ilike.%${intent.personName}%`)
      }

      const { data: outgoing, error } = await query.order("send_date", { ascending: false }).limit(50)

      if (error) {
        console.error("[v0] 查询送礼错误:", error)
      } else {
        outgoingData = outgoing
        console.log("[v0] 查询到送礼数据:", outgoing?.length, "条")
      }
    }

    // 构建上下文数据
    if (giftData && giftData.length > 0) {
      contextData += `\n收到的礼物记录（最近${giftData.length}条）：\n${JSON.stringify(giftData, null, 2)}\n`
    }

    if (contactData && contactData.length > 0) {
      contextData += `\n联系人信息（${contactData.length}条）：\n${JSON.stringify(contactData, null, 2)}\n`
    }

    if (inventoryData && inventoryData.length > 0) {
      contextData += `\n库存信息（${inventoryData.length}条）：\n${JSON.stringify(inventoryData, null, 2)}\n`
    }

    if (outgoingData && outgoingData.length > 0) {
      contextData += `\n送出的礼物记录（最近${outgoingData.length}条）：\n${JSON.stringify(outgoingData, null, 2)}\n`
    }

    console.log("[v0] 上下文数据长度:", contextData.length)

    // 调用 Groq AI
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `你是一个礼物管理系统的智能助手。你可以帮助用户：
1. 查询礼物记录（收到的、送出的）
2. 查询联系人信息
3. 查询库存情况
4. 提供送礼建议
5. 回答礼物相关的问题

你有以下系统数据可以使用：
${contextData || "（暂无相关数据）"}

请根据上面的数据回答用户的问题。注意：
- 如果数据中有答案，请提取关键信息并用友好的方式回答
- 包含具体的礼物名称、数量、价值、日期等信息
- 如果数据不足，请说明并建议用户去相应页面查看
- 使用友好、专业的中文`,
          },
          ...conversationHistory,
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("[v0] Groq API 错误:", errorText)
      throw new Error("Groq API 调用失败")
    }

    const groqData = await groqResponse.json()
    const aiResponse = groqData.choices[0]?.message?.content || "抱歉，我无法回答这个问题。"

    console.log("[v0] AI回答:", aiResponse.substring(0, 100))

    return NextResponse.json({
      response: aiResponse,
      success: true,
    })
  } catch (error) {
    console.error("[v0] AI聊天错误:", error)
    return NextResponse.json(
      {
        response: "抱歉，我遇到了一些问题。请稍后再试。",
        success: false,
      },
      { status: 500 },
    )
  }
}

function analyzeIntent(message: string) {
  const lowerMessage = message.toLowerCase()

  // 先提取姓氏+名字，然后清理掉后面的动词
  const nameMatch = message.match(
    /([李王张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段漕钱汤尹黎易常武乔贺赖龚文])[\u4e00-\u9fa5]{1,2}/,
  )

  // 清理掉常见的动词后缀
  let personName = nameMatch ? nameMatch[0] : null
  if (personName) {
    personName = personName.replace(/(送|收|给|的|是|有|要|问)$/, "")
  }

  return {
    // 检测询问收到的礼物：收到、收礼、谁送、送了（被动）、送给我、送我
    needsGiftData: /收到|收礼|礼物.*收|谁送|送了.*我|送给.*我|送我|送.*什么/.test(message),
    needsContactData: /联系人|公司|电话|年龄|性别/.test(message),
    needsInventoryData: /库存|还有|剩余|多少/.test(message),
    // 检测主动送礼：我送、送出、送过、送给
    needsOutgoingData: /我送|送出|送过|送给(?!.*我)/.test(message),
    personName: personName,
  }
}
