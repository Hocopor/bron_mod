import { prisma } from '@/lib/db'
import { AdminRoomsClient } from '@/components/admin/AdminRoomsClient'

export const metadata = { title: 'Номера — Панель управления' }
export const revalidate = 0

export default async function AdminRoomsPage() {
  const objects = await prisma.propertyObject.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { rooms: true } },
      rooms: {
        orderBy: { sortOrder: 'asc' },
        include: {
          pricePeriods: { orderBy: { dateFrom: 'asc' } },
          _count: { select: { bookings: true } },
          blockedDates: { where: { dateTo: { gte: new Date() } } },
          bookings: {
            where: { status: { in: ['CONFIRMED', 'PENDING'] }, checkOut: { gte: new Date() } },
            select: { checkIn: true, checkOut: true, guestName: true, status: true },
            orderBy: { checkIn: 'asc' },
          },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Номера</h1>
          <p className="text-gray-500 text-sm mt-1">Объекты и номера внутри них</p>
        </div>
      </div>
      <AdminRoomsClient objects={objects as any} />
    </div>
  )
}
