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

  // Use the fast fallback list for immediate UI response.
  // The TRUE security verification and routing happens in the layout.tsx files 
  // using the admin client, so this is just for UX speed.
  const isFinance = isFinanceUser(userEmail)

  // Already logged in → redirect away from login
  if (user && pathname === '/login') {
    if (isFinance) {
      return NextResponse.redirect(new URL('/dashboard/finance', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard/hrd', request.url))
  }

  // Basic guard (true enforcement is in layout.tsx)
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
