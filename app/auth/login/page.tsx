"use client"

import type React from "react"

import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Gift } from "lucide-react"

// 清除所有 Supabase 相关数据的函数
function clearAllSupabaseData() {
  // 清除所有 cookie
  const allCookies = document.cookie.split(";")
  allCookies.forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim()
    if (cookieName) {
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
    }
  })
  
  // 清除所有 localStorage
  try {
    localStorage.clear()
  } catch (e) {
    // 忽略错误
  }
  
  // 清除所有 sessionStorage
  try {
    sessionStorage.clear()
  } catch (e) {
    // 忽略错误
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 页面加载时清除所有数据
    clearAllSupabaseData()
    // 等待一小段时间确保清除完成
    setTimeout(() => setIsReady(true), 100)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 清除旧数据
      clearAllSupabaseData()
      
      // 创建全新的 Supabase 客户端
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // 执行登录
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // 处理常见错误
        if (error.message === "Invalid login credentials") {
          throw new Error("邮箱或密码不正确")
        }
        if (error.message.includes("Failed to fetch")) {
          throw new Error("无法连接到服务器，请检查网络或稍后重试")
        }
        throw error
      }

      if (!data.user) {
        throw new Error("登录失败，请重试")
      }

      // 登录成功，跳转到首页
      window.location.replace("/")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "登录失败，请重试"
      setError(message)
      setIsLoading(false)
    }
  }
  
  if (!isReady) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #FAF7F0 0%, #F5E6D3 100%)" }}
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 animate-pulse"
            style={{ background: "linear-gradient(135deg, #B8323F 0%, #8B0000 100%)" }}
          >
            <Gift className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      id="login-container"
      className="min-h-screen flex items-center justify-center p-6 transition-opacity duration-300"
      style={{ background: "linear-gradient(135deg, #FAF7F0 0%, #F5E6D3 100%)" }}
    >
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300"
          style={{
            background: "linear-gradient(135deg, #FAF7F0 0%, #F5E6D3 100%)",
            opacity: isLoading ? 1 : 0,
          }}
        >
          <div className="text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 animate-pulse"
              style={{ background: "linear-gradient(135deg, #B8323F 0%, #8B0000 100%)" }}
            >
              <Gift className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-medium bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
              登录中，请稍候...
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: "linear-gradient(135deg, #B8323F 0%, #8B0000 100%)" }}
          >
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#B8323F] to-[#8B0000] bg-clip-text text-transparent">
            企业礼物管理系统
          </h1>
          <p className="text-gray-600 mt-2">请登录您的账户</p>
        </div>

        <Card className="border-2 shadow-lg" style={{ borderColor: "#D4AF37" }}>
          <CardHeader>
            <CardTitle className="text-2xl">管理员登录</CardTitle>
            <CardDescription>使用管理员账号登录系统</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@infist.ai"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[#D4AF37] focus:border-[#B8323F]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-[#D4AF37] focus:border-[#B8323F]"
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ background: "linear-gradient(135deg, #B8323F 0%, #8B0000 100%)" }}
                  disabled={isLoading}
                >
                  {isLoading ? "登录中..." : "登录"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
