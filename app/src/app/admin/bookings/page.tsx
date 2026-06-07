import { prisma } from '@/lib/db'
import Link from 'next/link'
import { AdminBookingsClient } from '@/components/admin/AdminBookingsClient'

export const metadata = { title: 'Бронирования — Панель управления' }
export const revalidate = 0

export default async function AdminBookingsPage() {
  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      include: {
        room: {
          select: {
            id: true,
            name: true,
            pricePerDay: true,
            pricePeriods: true,
            object: { select: { id: true, name: true, sortOrder: true } },
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.room.findMany({
      include: {
        pricePeriods: true,
        object: { select: { id: true, name: true, sortOrder: true } },
      },
      orderBy: [{ object: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Бронирования</h1>
          <p className="text-gray-500 text-sm mt-1">Календарь занятости и стоимость номеров</p>
        </div>
        <Link href="/admin/bookings/new" className="btn-primary text-sm bg-sea-600 text-white px-4 py-2 rounded-xl hover:bg-sea-700">
          + Добавить вручную
        </Link>
      </div>

      <AdminBookingsClient
        bookings={bookings as any}
        rooms={rooms as any}
      />
    </div>
  )
}
