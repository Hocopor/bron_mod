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
    .slice(0, 60) || `object-${Date.now()}`
}

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

// Создание Объекта (группы номеров).
export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Укажите название объекта.' }, { status: 400 })
  }

  let slug = body.slug ? slugify(String(body.slug)) : slugify(name)
  const exists = await prisma.propertyObject.findUnique({ where: { slug } })
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const object = await prisma.propertyObject.create({
    data: {
      name,
      slug,
      description: body.description ? String(body.description) : null,
      address: body.address ? String(body.address) : null,
      publicUrl: body.publicUrl ? String(body.publicUrl) : null,
      isActive: body.isActive ?? true,
      sortOrder: Number.parseInt(String(body.sortOrder ?? 0), 10) || 0,
    },
  })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json(object, { status: 201 })
}
