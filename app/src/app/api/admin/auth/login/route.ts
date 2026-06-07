import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminToken, ADMIN_COOKIE, COOKIE_MAX_AGE, type AdminSession } from '@/lib/admin-auth'
import { ensureSeedAdmin } from '@/lib/admin-seed'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

// Аутентификация по БД. Главный админ при первом старте «посевается» из env (ensureSeedAdmin),
// дальше его логин/пароль (как и сотрудников) живут в таблице AdminUser и меняются из админки.
async function authenticate(login: string, password: string): Promise<AdminSession | null> {
  try {
    const user = await prisma.adminUser.findUnique({ where: { login } })
    if (user && user.isActive) {
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (ok) return { login: user.login, userRole: user.role as AdminSession['userRole'] }
    }
  } catch {
    // БД недоступна — останется null
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const login = String(body.login ?? '')
    const password = String(body.password ?? '')

    await ensureSeedAdmin()

    const session = await authenticate(login, password)
    if (!session) {
      await new Promise((r) => setTimeout(r, 1000))
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    const token = await createAdminToken(session)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
