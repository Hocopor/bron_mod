import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || `room-${Date.now()}`
}

// Создание номера. Номер обязательно принадлежит Объекту (objectId).
export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.objectId) {
    return NextResponse.json({ error: 'Сначала выберите объект для номера.' }, { status: 400 })
  }
  const object = await prisma.propertyObject.findUnique({ where: { id: body.objectId } })
  if (!object) {
    return NextResponse.json({ error: 'Объект не найден.' }, { status: 400 })
  }

  const name = String(body.name || '').trim() || 'Новый номер'
  const baseCapacity = Math.max(1, Number.parseInt(String(body.baseCapacity ?? 2), 10) || 1)
  const extraCapacity = Math.max(0, Number.parseInt(String(body.extraCapacity ?? 0), 10) || 0)

  let slug = body.slug ? slugify(String(body.slug)) : slugify(name)
  // Гарантируем уникальность slug.
  const exists = await prisma.room.findUnique({ where: { slug } })
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const room = await prisma.room.create({
    data: {
      objectId: body.objectId,
      name,
      slug,
      description: String(body.description || ''),
      shortDescription: String(body.shortDescription || ''),
      baseCapacity,
      extraCapacity,
      capacity: baseCapacity + extraCapacity,
      area: body.area != null && body.area !== '' ? Number.parseInt(String(body.area), 10) : null,
      floor: body.floor != null && body.floor !== '' ? Number.parseInt(String(body.floor), 10) : null,
      pricePerDay: Math.max(0, Number.parseInt(String(body.pricePerDay ?? 0), 10) || 0),
      images: Array.isArray(body.images) ? body.images : [],
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      isActive: body.isActive ?? true,
      sortOrder: Number.parseInt(String(body.sortOrder ?? 0), 10) || 0,
    },
  })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json(room, { status: 201 })
}
