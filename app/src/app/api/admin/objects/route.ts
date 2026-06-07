import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { normalizeDomain } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const objects = await prisma.propertyObject.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { rooms: true } } },
  })
  return NextResponse.json(objects)
}

// Создание Объекта (группы номеров). Объект — внутренняя сущность; публичная
// привязка идёт через `domain` (поддомен, направленный на VPS).
export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Укажите название объекта.' }, { status: 400 })
  }

  const domain = body.domain ? normalizeDomain(String(body.domain)) : null
  if (domain) {
    const exists = await prisma.propertyObject.findUnique({ where: { domain } })
    if (exists) {
      return NextResponse.json({ error: 'Этот домен уже привязан к другому объекту.' }, { status: 409 })
    }
  }

  const object = await prisma.propertyObject.create({
    data: {
      name,
      domain,
      address: body.address ? String(body.address) : null,
      isActive: body.isActive ?? true,
      sortOrder: Number.parseInt(String(body.sortOrder ?? 0), 10) || 0,
    },
  })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json(object, { status: 201 })
}
