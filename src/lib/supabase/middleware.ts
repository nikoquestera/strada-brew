import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isFinanceUser } from '@/lib/auth/access'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/apply')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email?.toLowerCase() || ''

  // Already logged in → redirect away from login
  if (user && pathname === '/login') {
    if (isFinanceUser(userEmail)) {
      return NextResponse.redirect(new URL('/dashboard/finance', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard/hrd', request.url))
  }

  if (user && pathname.startsWith('/dashboard/finance') && !isFinanceUser(userEmail)) {
    return NextResponse.redirect(new URL('/dashboard/hrd', request.url))
  }

  if (user && pathname.startsWith('/dashboard/hrd') && isFinanceUser(userEmail)) {
    return NextResponse.redirect(new URL('/dashboard/finance', request.url))
  }

  // Not logged in → redirect to login (except public routes)
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
