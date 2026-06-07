import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import {
  getAdminSessionFromRequest,
  createAdminToken,
  ADMIN_COOKIE,
  COOKIE_MAX_AGE,
} from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Текущий вошедший пользователь админ-панели.
export async function GET(req: NextRequest) {
  const session = await getAdminSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.adminUser.findUnique({
    where: { login: session.login },
    select: { id: true, login: true, role: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

// Смена собственных логина/пароля. Доступно только главному админу (ADMIN);
// сотрудник (STAFF) свой пароль менять не может (по ТЗ).
export async function PATCH(req: NextRequest) {
  const session = await getAdminSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав для смены своих данных.' }, { status: 403 })
  }

  const current = await prisma.adminUser.findUnique({ where: { login: session.login } })
  if (!current) return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, string> = {}

  const newLogin = body.login !== undefined ? String(body.login).trim() : undefined
  if (newLogin !== undefined && newLogin !== current.login) {
    if (!newLogin) {
      return NextResponse.json({ error: 'Логин не может быть пустым.' }, { status: 400 })
    }
    const taken = await prisma.adminUser.findUnique({ where: { login: newLogin } })
    if (taken) {
      return NextResponse.json({ error: 'Этот логин уже занят.' }, { status: 409 })
    }
    data.login = newLogin
  }

  if (body.password) {
    const password = String(body.password)
    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль минимум 6 символов.' }, { status: 400 })
    }
    data.passwordHash = bcrypt.hashSync(password, 10)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Нет изменений.' }, { status: 400 })
  }

  const updated = await prisma.adminUser.update({
    where: { id: current.id },
    data,
    select: { id: true, login: true, role: true },
  })

  // Логин в JWT (sub) мог измениться — перевыпускаем cookie, чтобы сессия не «протухла».
  const token = await createAdminToken({ login: updated.login, userRole: 'ADMIN' })
  const res = NextResponse.json(updated)
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}
