import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_COOKIE = 'admin_session'

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  const secret = getJwtSecret()
  if (!secret) return false
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') ?? ''
  const adminDomain = process.env.ADMIN_DOMAIN

  // --- Subdomain isolation (production) ---
  if (adminDomain) {
    const isAdminHost = host === adminDomain || host.startsWith(`${adminDomain}:`)

    if (isAdminHost) {
      // Admin subdomain: only /admin/* and /api/admin/* are allowed
      if (
        !pathname.startsWith('/admin') &&
        !pathname.startsWith('/api/admin') &&
        !pathname.startsWith('/_next') &&
        !pathname.startsWith('/images') &&
        !pathname.startsWith('/uploads')
      ) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    } else {
      // Main domain: block admin routes entirely
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      // Block admin API routes on the main domain
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }
  }

  // --- Block auth pages on any domain ---
  if (pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // --- Block account pages (no user accounts anymore) ---
  if (pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // --- Admin login page: redirect authenticated users to dashboard ---
  if (pathname === '/admin/login') {
    const authed = await isAdminAuthenticated(req)
    if (authed) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  // --- Protect all other /admin/* routes ---
  if (pathname.startsWith('/admin')) {
    const authed = await isAdminAuthenticated(req)
    if (!authed) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  // --- Protect /api/admin/* routes (except auth endpoints) ---
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const authed = await isAdminAuthenticated(req)
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|images/|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2?|ttf|otf|map)$).*)',
  ],
}
