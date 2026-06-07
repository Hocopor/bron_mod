import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, Home, Waves } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getRoomPriceRange, normalizeRoomPricePeriods } from '@/lib/pricing'
import { normalizeAmenities, normalizeDomain } from '@/lib/utils'
import { getSettings } from '@/lib/settings'
import { RoomCard } from '@/components/rooms/RoomCard'

export const dynamic = 'force-dynamic'

// Корень публичного сайта = страница объекта, определяемого по домену запроса.
// Гость заходит на поддомен объекта → сразу видит список его номеров.
async function getObjectByHost() {
  const host = headers().get('host') ?? ''
  const domain = normalizeDomain(host)
  if (!domain) return null
  return prisma.propertyObject.findFirst({
    where: { domain, isActive: true },
    include: {
      rooms: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { pricePeriods: { orderBy: { dateFrom: 'asc' } } },
      },
    },
  })
}

export async function generateMetadata() {
  const object = await getObjectByHost()
  return { title: object?.name || 'Бронирование номеров' }
}

export default async function HomePage() {
  const [object, settings] = await Promise.all([
    getObjectByHost(),
    getSettings(['nav_home_url', 'nav_back_url']),
  ])

  const homeUrl = settings.nav_home_url || '/'
  const backUrl = settings.nav_back_url || settings.nav_home_url || '/'

  if (!object) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <Waves className="mx-auto mb-4 h-14 w-14 text-sea-200" />
          <p className="text-gray-500">
            По этому адресу пока нет объекта для бронирования.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Навигация: «Назад» слева, «На главную» справа (ссылки из настроек) */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-2 pt-6 sm:px-6 lg:px-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 font-medium text-sea-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Назад
        </Link>
        <Link
          href={homeUrl}
          className="inline-flex items-center gap-2 font-medium text-gray-500 hover:text-sea-700"
        >
          <Home className="h-4 w-4" /> На главную
        </Link>
      </div>

      <section className="py-8">
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
