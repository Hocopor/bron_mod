import { prisma } from '@/lib/db'
import { AdminManualBookingForm } from '@/components/admin/AdminManualBookingForm'

export const metadata = { title: 'Добавить бронь вручную' }

export default async function NewBookingPage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      pricePerDay: true,
      capacity: true,
      pricePeriods: {
        orderBy: { dateFrom: 'asc' },
        select: { pricePerDay: true, dateFrom: true, dateTo: true },
      },
    },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900">Добавить бронь вручную</h1>
        <p className="text-gray-500 text-sm mt-1">Для броней по телефону или других источников</p>
      </div>
      <AdminManualBookingForm rooms={rooms} />
    </div>
  )
}
