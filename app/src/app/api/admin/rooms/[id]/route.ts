import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { normalizeRoomPricePeriods, validateRoomPricePeriods } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const existingRoom = await prisma.room.findUnique({
    where: { id: params.id },
    select: { slug: true },
  })
  if (!existingRoom) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const hasBaseCapacity = body.baseCapacity !== undefined
  const hasExtraCapacity = body.extraCapacity !== undefined
  const normalizedBaseCapacity = hasBaseCapacity ? Math.max(0, Number.parseInt(String(body.baseCapacity), 10) || 0) : undefined
  const normalizedExtraCapacity = hasExtraCapacity ? Math.max(0, Number.parseInt(String(body.extraCapacity), 10) || 0) : undefined

  let normalizedPricePeriods: ReturnType<typeof normalizeRoomPricePeriods> | null = null
  if (body.pricePeriods !== undefined) {
    try {
      normalizedPricePeriods = normalizeRoomPricePeriods(body.pricePeriods)
    } catch {
      return NextResponse.json({ error: 'Некорректный формат периодов цен.' }, { status: 400 })
    }
    const validationError = validateRoomPricePeriods(normalizedPricePeriods)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
  }

  const room = await prisma.$transaction(async (tx) => {
    const currentRoom = await tx.room.findUnique({
      where: { id: params.id },
      select: { baseCapacity: true, extraCapacity: true, capacity: true },
    })
    if (!currentRoom) return null

    const nextBaseCapacity = normalizedBaseCapacity ?? currentRoom.baseCapacity
    const nextExtraCapacity = normalizedExtraCapacity ?? currentRoom.extraCapacity
    const nextCapacity = hasBaseCapacity || hasExtraCapacity
      ? Math.max(1, nextBaseCapacity + nextExtraCapacity)
      : currentRoom.capacity

    await tx.room.update({
      where: { id: params.id },
      data: {
        ...(body.objectId !== undefined && { objectId: body.objectId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.pricePerDay !== undefined && { pricePerDay: body.pricePerDay }),
        ...(hasBaseCapacity && { baseCapacity: nextBaseCapacity }),
        ...(hasExtraCapacity && { extraCapacity: nextExtraCapacity }),
        capacity: nextCapacity,
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.area !== undefined && { area: body.area }),
        ...(body.floor !== undefined && { floor: body.floor }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.amenities !== undefined && { amenities: body.amenities }),
        ...(body.images !== undefined && { images: body.images }),
      },
    })

    if (normalizedPricePeriods !== null) {
      await tx.roomPricePeriod.deleteMany({ where: { roomId: params.id } })
      if (normalizedPricePeriods.length > 0) {
        await tx.roomPricePeriod.createMany({
          data: normalizedPricePeriods.map((period) => ({
            roomId: params.id,
            pricePerDay: period.pricePerDay,
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
          })),
        })
      }
    }

    return tx.room.findUnique({ where: { id: params.id }, include: { pricePeriods: true } })
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')

  return NextResponse.json(room)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Не даём удалить номер с существующими бронями (целостность истории).
  const bookingsCount = await prisma.booking.count({ where: { roomId: params.id } })
  if (bookingsCount > 0) {
    return NextResponse.json(
      { error: 'У номера есть брони. Сначала удалите/отмените их, либо скройте номер.' },
      { status: 409 },
    )
  }

  await prisma.room.delete({ where: { id: params.id } })

  revalidatePath('/admin/rooms')
  revalidatePath('/admin/bookings')
  return NextResponse.json({ ok: true })
}
