import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getDepositSettings, calculateDeposit } from '@/lib/settings'
import { countNights } from '@/lib/utils'
import {
  buildNightlyPriceBreakdown,
  calculateNightlyBreakdownTotal,
  normalizeRoomPricePeriods,
} from '@/lib/pricing'
import { z } from 'zod'
import { isAfter, parseISO, startOfDay } from 'date-fns'

const bookingSchema = z.object({
  roomId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Некорректная дата заезда'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Некорректная дата выезда'),
  guests: z.number().min(1).max(30),
  hasPets: z.boolean().default(false),
  petsDescription: z.string().optional(),
  smoking: z.boolean().default(false),
  transferNeeded: z.boolean().default(false),
  transferFrom: z.string().optional(),
  transferDate: z.string().optional(),
  transferUnknown: z.boolean().default(false),
  guestName: z.string().min(2),
  guestPhone: z.string().min(7),
  guestEmail: z.string().email().optional().or(z.literal('')),
  comment: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные', details: parsed.error.errors }, { status: 400 })
    }

    const data = parsed.data

    // Нормализуем телефон.
    let cleanedPhone = data.guestPhone.trim().replace(/[\s\-\(\)]/g, '')
    if (cleanedPhone.startsWith('8') && cleanedPhone.length === 11) {
      cleanedPhone = '+7' + cleanedPhone.substring(1)
    }
    data.guestPhone = cleanedPhone
    if (!/^\+7\d{10}$/.test(data.guestPhone)) {
      return NextResponse.json({ error: 'Введите номер телефона корректно в формате +7...' }, { status: 400 })
    }

    const checkIn = parseISO(data.checkIn)
    const checkOut = parseISO(data.checkOut)

    if (!isAfter(checkOut, checkIn)) {
      return NextResponse.json({ error: 'Дата выезда должна быть позже даты заезда' }, { status: 400 })
    }

    // Прошлое = строго раньше начала сегодняшнего дня. Сегодня — допустимо.
    if (checkIn < startOfDay(new Date())) {
      return NextResponse.json({ error: 'Дата заезда не может быть в прошлом' }, { status: 400 })
    }

    const nights = countNights(checkIn, checkOut)
    if (nights < 1) {
      return NextResponse.json({ error: 'Минимальный срок бронирования — 1 ночь' }, { status: 400 })
    }

    const room = await prisma.room.findUnique({
      where: { id: data.roomId, isActive: true },
      include: { pricePeriods: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Номер не найден' }, { status: 404 })
    }

    if (data.guests > room.capacity) {
      return NextResponse.json({ error: `Максимум ${room.capacity} гостей в этом номере` }, { status: 400 })
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [{ checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }],
      },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Выбранные даты уже заняты. Пожалуйста, выберите другие даты.' }, { status: 409 })
    }

    const blockedConflict = await prisma.blockedDate.findFirst({
      where: { roomId: data.roomId, dateFrom: { lt: checkOut }, dateTo: { gt: checkIn } },
    })
    if (blockedConflict) {
      return NextResponse.json({ error: 'Выбранные даты недоступны.' }, { status: 409 })
    }

    const normalizedPricePeriods = normalizeRoomPricePeriods(room.pricePeriods)
    const priceBreakdown = buildNightlyPriceBreakdown(checkIn, checkOut, room.pricePerDay, normalizedPricePeriods)
    const totalPrice = calculateNightlyBreakdownTotal(priceBreakdown)
    const depositSettings = await getDepositSettings()
    const depositAmount = calculateDeposit(totalPrice, depositSettings)

    const booking = await prisma.booking.create({
      data: {
        roomId: data.roomId,
        checkIn,
        checkOut,
        nights,
        guests: data.guests,
        hasPets: data.hasPets,
        petsDescription: data.petsDescription,
        smoking: data.smoking,
        transferNeeded: data.transferNeeded,
        transferFrom: data.transferFrom,
        transferDate: data.transferDate ? parseISO(data.transferDate) : null,
        transferUnknown: data.transferUnknown,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail || null,
        comment: data.comment,
        totalPrice,
        depositAmount,
        depositType: depositSettings.type,
        depositValue: depositSettings.type === 'PERCENT' ? depositSettings.percent : depositSettings.fixed,
        priceBreakdown: priceBreakdown as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        source: 'WEBSITE',
      },
    })

    return NextResponse.json({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      totalPrice,
      depositAmount,
      guestPhone: data.guestPhone,
    })
  } catch (err) {
    console.error('Booking creation error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
