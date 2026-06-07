import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  const session = await getAdminSessionFromRequest(req)
  if (!session) return { ok: false as const, status: 401 }
  if (session.userRole !== 'ADMIN') return { ok: false as const, status: 403 }
  return { ok: true as const, session }
}

// Сброс пароля / роли / активности сотрудника (делает только главный админ).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.password !== undefined) {
    const password = String(body.password)
    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль минимум 6 символов.' }, { status: 400 })
    }
    data.passwordHash = bcrypt.hashSync(password, 10)
  }
  if (body.role !== undefined) data.role = body.role === 'ADMIN' ? 'ADMIN' : 'STAFF'
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

  const user = await prisma.adminUser.update({
    where: { id: params.id },
    data,
    select: { id: true, login: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  await prisma.adminUser.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
