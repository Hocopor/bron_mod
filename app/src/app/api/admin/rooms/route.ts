import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// Slug номера генерируется автоматически и НЕ зависит от названия:
// название бывает русским, а кириллица в URL percent-кодируется и ломает
// ссылки/совпадение. Делаем короткий гарантированно-ASCII идентификатор
// и проверяем его уникальность в БД.
async function generateUniqueRoomSlug(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `room-${randomBytes(5).toString('hex')}`
    const exists = await prisma.room.findUnique({ where: { slug } })
    if (!exists) return slug
  }
  // Крайне маловероятно: добираем уникальность временной меткой.
  return `room-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
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
  const capacity = Math.max(1, Number.parseInt(String(body.capacity ?? 1), 10) || 1)

  // slug генерируется автоматически (ASCII, не из названия — см. выше).
  const slug = await generateUniqueRoomSlug()

  const room = await prisma.room.create({
    data: {
      objectId: body.objectId,
      name,
      slug,
      description: String(body.description || ''),
      shortDescription: String(body.shortDescription || ''),
      capacity,
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
