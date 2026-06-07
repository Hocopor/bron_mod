'use client'

import { type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Maximize2, Users } from 'lucide-react'
import { formatMoney, formatMoneyRange, getRoomCapacityBreakdown } from '@/lib/utils'
import { RoomImageCarousel } from '@/components/rooms/RoomImageCarousel'

interface Props {
  href: string
  name: string
  shortDescription: string
  images: string[]
  capacity: number
  baseCapacity: number
  extraCapacity: number
  area?: number | null
  floor?: number | null
  previewAmenities: string[]
  minPrice: number
  maxPrice: number
  hasPriceRange: boolean
}

export function RoomCard({
  href,
  name,
  shortDescription,
  images,
  capacity,
  baseCapacity,
  extraCapacity,
  area,
  floor,
  previewAmenities,
  minPrice,
  maxPrice,
  hasPriceRange,
}: Props) {
  const router = useRouter()

  const openRoom = () => {
    router.push(href)
  }

  const onCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openRoom()
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openRoom}
      onKeyDown={onCardKeyDown}
      className="card group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-px lg:flex"
    >
      <div className="lg:w-96 lg:flex-shrink-0 xl:w-[28rem]">
        <RoomImageCarousel images={images} name={name} className="h-56 sm:h-64 lg:h-full" />
      </div>

      <div className="flex-1 p-5 sm:p-6 lg:p-7 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-gray-900 leading-snug">{name}</h2>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{shortDescription}</p>
            </div>
            <div className="sm:flex-shrink-0">
              <div className="flex items-baseline gap-1 sm:justify-end flex-nowrap">
                <span className="text-xl sm:text-2xl font-bold text-sea-700 whitespace-nowrap">
                  {hasPriceRange ? formatMoneyRange(minPrice, maxPrice) : formatMoney(minPrice)}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">в сутки</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
            <span className="badge-sea">
              <Users className="h-3 w-3" />{' '}
              {getRoomCapacityBreakdown(
                baseCapacity,
                extraCapacity || Math.max(0, capacity - baseCapacity),
              )}
            </span>
            {area ? (
              <span className="badge-sea">
                <Maximize2 className="h-3 w-3" /> {area} м²
              </span>
            ) : null}
            {floor !== null && floor !== undefined ? (
              <span className="badge-sea">Этаж {floor}</span>
            ) : null}
          </div>

          {previewAmenities.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {previewAmenities.map((item) => (
                <span key={item} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" /> {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-5">
          <Link
            href={href}
            onClick={(event) => event.stopPropagation()}
            className="btn-primary w-full sm:w-auto justify-center"
          >
            Забронировать
          </Link>
        </div>
      </div>
    </article>
  )
}
