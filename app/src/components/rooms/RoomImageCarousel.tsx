'use client'

import { type MouseEvent, useCallback, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Waves } from 'lucide-react'
import { AppImage } from '@/components/ui/AppImage'
import { cn } from '@/lib/utils'
import { buildRoomImageAlt } from '@/lib/seo'

interface Props {
  images: string[]
  name: string
  className?: string
  priority?: boolean
}

export function RoomImageCarousel({ images, name, className, priority = false }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  const loadedRef = useRef(new Set<string>())
  const [, setLoadedTick] = useState(0)

  const markLoaded = useCallback((url: string) => {
    if (loadedRef.current.has(url)) return
    loadedRef.current.add(url)
    setLoadedTick((n) => n + 1)
  }, [])

  const hasImages = images.length > 0
  const hasMultiple = images.length > 1
  const currentImage = hasImages ? images[activeIndex] : null
  const isCurrentLoaded = currentImage ? loadedRef.current.has(currentImage) : false

  const showPrevious = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveIndex((current) => (current - 1 + images.length) % images.length)
  }

  const showNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveIndex((current) => (current + 1) % images.length)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-sea-100 to-sea-200',
        className,
      )}
    >
      {currentImage ? (
        <>
          {!isCurrentLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-sea-100 to-sea-200">
              <Loader2 className="h-8 w-8 animate-spin text-sea-300" />
            </div>
          )}
          <AppImage
            key={currentImage}
            src={currentImage}
            alt={buildRoomImageAlt(name, activeIndex)}
            fill
            variant="card"
            sizes="(max-width: 1024px) 100vw, 30vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            priority={priority}
            onLoad={() => markLoaded(currentImage)}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Waves className="h-20 w-20 text-sea-300" />
        </div>
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={showPrevious}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={showNext}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Показать фото ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setActiveIndex(index)
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
