import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// 这个 API 路由会被 Vercel Cron 定期调用，保持 Supabase 项目活跃
export async function GET() {
  try {
    const supabase = await createClient()
    
    // 执行一个简单的查询，保持数据库连接活跃
    const { count, error } = await supabase
      .from("gifts")
      .select("*", { count: "exact", head: true })
    
    if (error) {
      console.error("[Keep-Alive] 查询失败:", error)
      return NextResponse.json({ status: "error", message: error.message }, { status: 500 })
    }
    
    console.log("[Keep-Alive] 成功，礼物数量:", count)
    return NextResponse.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      giftsCount: count 
    })
  } catch (error: any) {
    console.error("[Keep-Alive] 异常:", error)
    return NextResponse.json({ status: "error", message: error?.message }, { status: 500 })
  }
}
