import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const objects = await prisma.propertyObject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { rooms: { where: { isActive: true } } } } },
  })

  return (
    <div className="min-h-screen bg-sand-50">
      <section className="bg-sea-700 page-hero text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h1 className="mb-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            Онлайн-бронирование
          </h1>
          <p className="text-base sm:text-lg text-white/75">Выберите объект для размещения</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 sm:grid-cols-2 lg:px-8">
          {objects.map((object) => (
            <Link
              key={object.id}
              href={`/o/${object.slug}`}
              className="card group flex items-center justify-between gap-4 p-6 transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-gray-900">{object.name}</div>
                  {object.address && <div className="text-sm text-gray-500">{object.address}</div>}
                  <div className="mt-0.5 text-xs text-gray-400">{object._count.rooms} номеров</div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-sea-600" />
            </Link>
          ))}

          {objects.length === 0 && (
            <p className="col-span-full py-16 text-center text-gray-500">
              Пока нет доступных объектов для бронирования.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
