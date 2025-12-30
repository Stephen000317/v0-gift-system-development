"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Gift } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    // 清除所有旧的会话数据，确保用户可以重新登录
    supabase.auth.signOut({ scope: "local" }).catch(() => {
      // 忽略错误，因为可能根本没有会话
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] 开始登录流程")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.log("[v0] 登录失败:", error)
        if (error.message === "Invalid login credentials") {
          throw new Error("邮箱或密码不正确")
        }
        throw error
      }

      console.log("[v0] 登录成功，准备跳转")

      // 使用 replace 而不是 href，避免在历史记录中保留登录页
      window.location.replace("/")
    } catch (error: unknown) {
      console.log("[v0] 登录错误:", error)
      setError(error instanceof Error ? error.message : "登录失败")
      setIsLoading(false)
    }
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
