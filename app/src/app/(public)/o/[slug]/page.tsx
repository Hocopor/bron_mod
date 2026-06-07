import { notFound } from 'next/navigation'
import { Waves } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getRoomPriceRange, normalizeRoomPricePeriods } from '@/lib/pricing'
import { normalizeAmenities } from '@/lib/utils'
import { getSettings } from '@/lib/settings'
import { RoomCard } from '@/components/rooms/RoomCard'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

async function getObject(slug: string) {
  return prisma.propertyObject.findFirst({
    where: { slug, isActive: true },
    include: {
      rooms: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { pricePeriods: { orderBy: { dateFrom: 'asc' } } },
      },
    },
  })
}

export async function generateMetadata({ params }: Props) {
  const object = await prisma.propertyObject.findFirst({
    where: { slug: params.slug, isActive: true },
    select: { name: true },
  })
  return { title: object?.name || 'Бронирование' }
}

export default async function ObjectCatalogPage({ params }: Props) {
  const [object, settings] = await Promise.all([
    getObject(params.slug),
    getSettings(['check_in_time', 'check_out_time']),
  ])

  if (!object) notFound()

  const checkIn = settings.check_in_time || '14:00'
  const checkOut = settings.check_out_time || '12:00'

  return (
    <div className="min-h-screen">
      <section className="bg-sea-700 page-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 right-0 w-80 h-80 bg-sea-500 rounded-full blur-3xl opacity-20" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h1 className="mb-4 font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            {object.name}
          </h1>
          {object.description && (
            <p className="text-base sm:text-lg text-white/75 max-w-2xl mx-auto">{object.description}</p>
          )}
        </div>
      </section>

      <section className="sticky top-0 z-30 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Доступно {object.rooms.length} номеров</span>
            <span className="text-gray-300">|</span>
            <span>Заезд с {checkIn} · Выезд до {checkOut}</span>
          </div>
        </div>
      </section>

      <section className="bg-sand-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {object.rooms.map((room) => {
              const customAmenities = normalizeAmenities(room.amenities)
              const priceRange = getRoomPriceRange(
                room.pricePerDay,
                normalizeRoomPricePeriods(room.pricePeriods || []),
              )

              return (
                <RoomCard
                  key={room.id}
                  href={`/rooms/${room.slug}`}
                  name={room.name}
                  shortDescription={room.shortDescription}
                  images={room.images}
                  capacity={room.capacity}
                  baseCapacity={room.baseCapacity ?? room.capacity}
                  extraCapacity={room.extraCapacity ?? 0}
                  area={room.area}
                  floor={room.floor}
                  previewAmenities={customAmenities.slice(0, 7)}
                  minPrice={priceRange.minPrice}
                  maxPrice={priceRange.maxPrice}
                  hasPriceRange={priceRange.hasRange}
                />
              )
            })}
          </div>

          {object.rooms.length === 0 && (
            <div className="py-20 text-center">
              <Waves className="mx-auto mb-4 h-16 w-16 text-sea-200" />
              <p className="text-gray-500">
                Номера временно недоступны. Пожалуйста, свяжитесь с нами напрямую.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
