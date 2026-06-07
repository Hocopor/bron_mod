import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()

  const object = await prisma.propertyObject.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.slug !== undefined && { slug: String(body.slug) }),
      ...(body.description !== undefined && { description: body.description ? String(body.description) : null }),
      ...(body.address !== undefined && { address: body.address ? String(body.address) : null }),
      ...(body.publicUrl !== undefined && { publicUrl: body.publicUrl ? String(body.publicUrl) : null }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(body.sortOrder !== undefined && { sortOrder: Number.parseInt(String(body.sortOrder), 10) || 0 }),
    },
  })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json(object)
}

// Удаление Объекта. Номера внутри удаляются каскадом (onDelete: Cascade).
// Запрещаем удаление, если у любого номера объекта есть брони.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bookingsCount = await prisma.booking.count({
    where: { room: { objectId: params.id } },
  })
  if (bookingsCount > 0) {
    return NextResponse.json(
      { error: 'В объекте есть номера с бронями. Сначала удалите/отмените брони.' },
      { status: 409 },
    )
  }

  await prisma.propertyObject.delete({ where: { id: params.id } })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json({ ok: true })
}
