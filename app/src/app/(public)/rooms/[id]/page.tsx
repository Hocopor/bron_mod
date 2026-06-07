import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, Home, Maximize2, Users } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getSettings, buildBookingDocuments, DOCUMENT_SETTING_KEYS } from '@/lib/settings'
import { getRoomPriceRange, normalizeRoomPricePeriods } from '@/lib/pricing'
import {
  formatMoney,
  formatMoneyRange,
  getRoomCapacityLabel,
  normalizeAmenities,
} from '@/lib/utils'
import { BookingForm } from '@/components/rooms/BookingForm'
import { RoomGallery } from '@/components/rooms/RoomGallery'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  const room = await prisma.room.findUnique({ where: { slug: params.id }, select: { name: true } })
  return { title: room?.name || 'Номер' }
}

async function getRoomData(slug: string) {
  const [room, settings] = await Promise.all([
    prisma.room.findUnique({
      where: { slug, isActive: true },
      include: {
        object: { select: { name: true } },
        pricePeriods: { orderBy: { dateFrom: 'asc' } },
        blockedDates: { where: { dateTo: { gte: new Date() } } },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            checkOut: { gte: new Date() },
          },
          select: { checkIn: true, checkOut: true, status: true },
        },
      },
    }),
    getSettings([
      'deposit_type',
      'deposit_percent',
      'deposit_fixed',
      'check_in_time',
      'check_out_time',
      'min_booking_days',
      'nav_home_url',
      'nav_back_url',
      ...DOCUMENT_SETTING_KEYS,
    ]),
  ])

  return { room, settings }
}

export default async function RoomDetailPage({ params }: Props) {
  const { room, settings } = await getRoomData(params.id)
  if (!room) notFound()

  const occupiedRanges = [
    ...room.bookings.map((booking) => ({
      from: new Date(booking.checkIn),
      to: new Date(booking.checkOut),
    })),
    ...room.blockedDates.map((item) => ({
      from: new Date(item.dateFrom),
      to: new Date(item.dateTo),
    })),
  ]

  const normalizedPricePeriods = normalizeRoomPricePeriods(room.pricePeriods || [])
  const priceRange = getRoomPriceRange(room.pricePerDay, normalizedPricePeriods)
  const customAmenities = normalizeAmenities(room.amenities)
  const capacityLabel = getRoomCapacityLabel(room.capacity)
  const documents = buildBookingDocuments(settings)

  // Кнопки «Назад»/«На главную»: настраиваемые URL из админки (обычно — Tilda),
  // иначе — корень домена объекта (список его номеров).
  const backUrl = settings.nav_back_url || '/'
  const homeUrl = settings.nav_home_url || '/'

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Навигация */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-4 pt-8 sm:px-6 lg:px-8">
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

      {/* Галерея */}
      <div className="px-3 sm:px-4">
        <RoomGallery images={room.images} name={room.name} />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2">
            <div className="card p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="mb-2 font-display text-3xl font-bold text-gray-900 md:text-4xl">
                    {room.name}
                  </h1>
                  <div className="flex flex-wrap gap-3">
                    <span className="badge-sea">
                      <Users className="h-3.5 w-3.5" /> {capacityLabel}
                    </span>
                    {room.area ? (
                      <span className="badge-sea">
                        <Maximize2 className="h-3.5 w-3.5" /> {room.area} м²
                      </span>
                    ) : null}
                    {room.floor !== null && room.floor !== undefined ? (
                      <span className="badge-sea">Этаж {room.floor}</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5 justify-end flex-nowrap">
                    <span className="text-3xl font-bold text-sea-700 whitespace-nowrap">
                      {priceRange.hasRange
                        ? formatMoneyRange(priceRange.minPrice, priceRange.maxPrice)
                        : formatMoney(priceRange.minPrice)}
                    </span>
                    <span className="text-sm text-gray-400 whitespace-nowrap">в сутки</span>
                  </div>
                </div>
              </div>

              <p className="mb-4 whitespace-pre-wrap text-lg leading-relaxed text-gray-700">
                {room.description}
              </p>

              {customAmenities.length > 0 && (
                <>
                  <h2 className="mb-5 font-display text-2xl font-semibold">Удобства</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {customAmenities.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2.5 rounded-xl bg-sand-50 p-3"
                      >
                        <CheckCircle className="h-5 w-5 flex-shrink-0 text-sea-600" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div id="booking" className="mt-8 lg:mt-0">
            <div className="card sticky top-6 p-6">
              <h2 className="mb-2 font-display text-2xl font-semibold text-gray-900">
                Забронировать
              </h2>
              <BookingForm
                roomId={room.id}
                roomSlug={room.slug}
                roomName={room.name}
                basePricePerDay={room.pricePerDay}
                pricePeriods={room.pricePeriods}
                maxGuests={room.capacity}
                occupiedRanges={occupiedRanges}
                documents={documents}
                depositSettings={{
                  type: (settings.deposit_type as 'PERCENT' | 'FIXED') || 'PERCENT',
                  percent: parseInt(settings.deposit_percent || '30', 10),
                  fixed: parseInt(settings.deposit_fixed || '200000', 10),
                }}
                minNights={parseInt(settings.min_booking_days || '1', 10)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
