import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export default async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // 清除所有认证cookie的辅助函数
  const clearAuthCookies = () => {
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase")) {
        response.cookies.delete(cookie.name)
      }
    })
  }

  // 公开路径（不需要认证）
  const publicPaths = ["/auth/login", "/api/keep-alive"]
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // 登录页面：清除旧cookie并直接放行
  if (request.nextUrl.pathname === "/auth/login") {
    clearAuthCookies()
    return response
  }

  // 其他公开路径：直接放行
  if (isPublicPath) {
    return response
  }

  // 受保护路径：验证用户身份
  let user = null
  
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      },
    )

    const { data, error } = await supabase.auth.getUser()
    
    if (!error && data.user) {
      user = data.user
    } else {
      clearAuthCookies()
    }
  } catch {
    // 任何错误（JSON解析、网络等）都清除cookie并重定向到登录
    clearAuthCookies()
  }

  // 未登录：重定向到登录页
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
