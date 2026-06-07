import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Управлять сотрудниками может только главный админ (роль ADMIN).
async function requireAdmin(req: NextRequest) {
  const session = await getAdminSessionFromRequest(req)
  if (!session) return { ok: false as const, status: 401 }
  if (session.userRole !== 'ADMIN') return { ok: false as const, status: 403 }
  return { ok: true as const, session }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, login: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(users)
}

// Создание сотрудника. Главный админ задаёт логин/пароль; сотрудник сменить пароль не сможет.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json()
  const login = String(body.login || '').trim()
  const password = String(body.password || '')
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'STAFF'

  if (!login || password.length < 6) {
    return NextResponse.json({ error: 'Укажите логин и пароль (минимум 6 символов).' }, { status: 400 })
  }
  if (login === process.env.ADMIN_LOGIN) {
    return NextResponse.json({ error: 'Этот логин занят главным админом.' }, { status: 409 })
  }
  const exists = await prisma.adminUser.findUnique({ where: { login } })
  if (exists) {
    return NextResponse.json({ error: 'Пользователь с таким логином уже существует.' }, { status: 409 })
  }

  const user = await prisma.adminUser.create({
    data: { login, passwordHash: bcrypt.hashSync(password, 10), role },
    select: { id: true, login: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
