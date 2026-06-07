import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

export const ADMIN_COOKIE = 'admin_session'
export const COOKIE_MAX_AGE = 60 * 60 * 12 // 12 hours

export type AdminUserRole = 'ADMIN' | 'STAFF'

export interface AdminSession {
  login: string
  userRole: AdminUserRole
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

// role:'admin' — общий флаг «пользователь админ-панели» (проверяет middleware).
// userRole — фактическая роль (ADMIN — главный, STAFF — сотрудник).
export async function createAdminToken(session: AdminSession): Promise<string> {
  return new SignJWT({ role: 'admin', sub: session.login, userRole: session.userRole })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getJwtSecret())
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function getAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.role !== 'admin') return null
    return {
      login: String(payload.sub || ''),
      userRole: (payload.userRole as AdminUserRole) || 'STAFF',
    }
  } catch {
    return null
  }
}

export async function verifyAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return verifyAdminToken(token)
}

export async function getAdminSessionFromRequest(req: NextRequest): Promise<AdminSession | null> {
  return getAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
}
