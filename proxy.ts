import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export default async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

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

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    // 如果是session不存在或refresh token无效的错误，清除所有认证cookie
    if (
      error &&
      (error.message.includes("session_not_found") ||
        error.message.includes("refresh_token_not_found") ||
        error.message.includes("Invalid Refresh Token"))
    ) {
      console.log("[Middleware] 检测到无效token，清除所有认证cookie")
      // 清除所有Supabase相关的cookie
      const cookieNames = request.cookies
        .getAll()
        .map((c) => c.name)
        .filter((name) => name.startsWith("sb-") || name.includes("supabase"))
      cookieNames.forEach((name) => {
        response.cookies.delete(name)
      })
      user = null
    } else {
      user = data.user
    }
  } catch (error: any) {
    console.error("[Middleware] Auth error:", error)
    // 发生任何错误都清除cookie，确保用户可以重新登录
    const cookieNames = request.cookies
      .getAll()
      .map((c) => c.name)
      .filter((name) => name.startsWith("sb-") || name.includes("supabase"))
    cookieNames.forEach((name) => {
      response.cookies.delete(name)
    })
    user = null
  }

  // 定义不需要认证的公开路径
  const publicPaths = ["/auth/login"]
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // 如果用户未登录且访问受保护的页面，重定向到登录页
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 如果用户已登录且访问登录页面，重定向到首页
  if (user && request.nextUrl.pathname === "/auth/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
