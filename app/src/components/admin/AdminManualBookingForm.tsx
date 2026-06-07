'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Loader2, ArrowLeft } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import {
  buildNightlyPriceBreakdown,
  calculateNightlyBreakdownTotal,
  getRoomPriceRange,
  normalizeRoomPricePeriods,
} from '@/lib/pricing'
import { useToast } from '@/components/providers/ToastProvider'

const schema = z.object({
  roomId: z.string().min(1, 'Выберите номер'),
  checkIn: z.string().min(1, 'Укажите дату заезда'),
  checkOut: z.string().min(1, 'Укажите дату выезда'),
  guestName: z.string().min(2, 'Введите имя'),
  guestPhone: z.string().min(7, 'Введите телефон'),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guests: z.number().min(1),
  hasPets: z.boolean(),
  smoking: z.boolean(),
  transferNeeded: z.boolean(),
  transferFrom: z.string().optional(),
  comment: z.string().optional(),
  source: z.enum(['PHONE', 'ADMIN', 'OTHER']),
  status: z.enum(['PENDING', 'CONFIRMED']),
  paymentStatus: z.enum(['UNPAID', 'DEPOSIT_PAID', 'FULLY_PAID']),
  adminNotes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface RoomPricePeriod {
  pricePerDay: number
  dateFrom: string | Date
  dateTo: string | Date
}

interface Room {
  id: string
  name: string
  pricePerDay: number
  capacity: number
  pricePeriods: RoomPricePeriod[]
}

export function AdminManualBookingForm({ rooms }: { rooms: Room[] }) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guests: 1,
      hasPets: false,
      smoking: false,
      transferNeeded: false,
      source: 'PHONE',
      status: 'CONFIRMED',
      paymentStatus: 'DEPOSIT_PAID',
    },
  })

  const roomId = watch('roomId')
  const checkIn = watch('checkIn')
  const checkOut = watch('checkOut')

  const selectedRoom = rooms.find((room) => room.id === roomId)
  const normalizedPricePeriods = useMemo(
    () => normalizeRoomPricePeriods(selectedRoom?.pricePeriods || []),
    [selectedRoom],
  )
  const roomPriceRange = useMemo(
    () => (
      selectedRoom
        ? getRoomPriceRange(selectedRoom.pricePerDay, normalizedPricePeriods)
        : null
    ),
    [normalizedPricePeriods, selectedRoom],
  )

  const nights = checkIn && checkOut
    ? Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)))
    : 0

  const priceBreakdown = useMemo(() => {
    if (!selectedRoom || !checkIn || !checkOut || nights < 1) {
      return []
    }

    return buildNightlyPriceBreakdown(
      parseISO(checkIn),
      parseISO(checkOut),
      selectedRoom.pricePerDay,
      normalizedPricePeriods,
    )
  }, [checkIn, checkOut, nights, normalizedPricePeriods, selectedRoom])

  const totalPrice = priceBreakdown.length > 0 ? calculateNightlyBreakdownTotal(priceBreakdown) : 0

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, totalPrice }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      success('Бронь создана успешно')
      router.push('/admin/bookings')
    } catch (e: any) {
      showError(e.message || 'Ошибка создания брони')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sea-700 text-sm hover:underline">
        <ArrowLeft className="w-4 h-4" /> Назад к списку
      </Link>

      <div className="admin-card space-y-4">
        <h2 className="font-semibold text-gray-800">Номер и даты</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Номер *</label>
          <select {...register('roomId')} className="input-field">
            <option value="">Выберите номер</option>
            {rooms.map((room) => {
              const range = getRoomPriceRange(room.pricePerDay, normalizeRoomPricePeriods(room.pricePeriods || []))
              const label = range.hasRange
                ? `${formatMoney(range.minPrice)}-${formatMoney(range.maxPrice)}`
                : formatMoney(range.minPrice)

              return (
                <option key={room.id} value={room.id}>
                  {room.name} — {label}
                </option>
              )
            })}
          </select>
          {errors.roomId && <p className="text-red-500 text-xs mt-1">{errors.roomId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата заезда *</label>
            <input type="date" {...register('checkIn')} className="input-field" />
            {errors.checkIn && <p className="text-red-500 text-xs mt-1">{errors.checkIn.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата выезда *</label>
            <input type="date" {...register('checkOut')} className="input-field" />
            {errors.checkOut && <p className="text-red-500 text-xs mt-1">{errors.checkOut.message}</p>}
          </div>
        </div>
        {selectedRoom && roomPriceRange && (
          <p className="text-xs text-gray-500">
            Базовая цена: {formatMoney(selectedRoom.pricePerDay)}.
            {roomPriceRange.hasRange ? ` Активный диапазон цен: ${formatMoney(roomPriceRange.minPrice)}-${formatMoney(roomPriceRange.maxPrice)}.` : ''}
          </p>
        )}
        {nights > 0 && selectedRoom && (
          <div className="p-4 bg-sea-50 rounded-xl border border-sea-100 text-sm space-y-2">
            {priceBreakdown.map((item) => (
              <div key={item.date} className="flex justify-between text-gray-600">
                <span>{item.date}</span>
                <span>{formatMoney(item.pricePerDay)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-sea-200 pt-2">
              <span className="text-gray-600">{nights} ночей</span>
              <span className="font-bold text-sea-700">{formatMoney(totalPrice)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-card space-y-4">
        <h2 className="font-semibold text-gray-800">Данные гостя</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Имя *</label>
            <input {...register('guestName')} className="input-field" />
            {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Телефон *</label>
            <input {...register('guestPhone')} type="tel" className="input-field" />
            {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Email</label>
          <input {...register('guestEmail')} type="email" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Количество гостей</label>
          <input type="number" min={1} max={selectedRoom?.capacity || 10} {...register('guests', { valueAsNumber: true })} className="input-field w-24" />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('hasPets')} className="accent-sea-700" /> Животные
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('smoking')} className="accent-sea-700" /> Курящие
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('transferNeeded')} className="accent-sea-700" /> Нужен трансфер
          </label>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Откуда трансфер</label>
          <input {...register('transferFrom')} placeholder="Город, вокзал, адрес" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Комментарий</label>
          <textarea {...register('comment')} rows={2} className="input-field resize-none" />
        </div>
      </div>

      <div className="admin-card space-y-4">
        <h2 className="font-semibold text-gray-800">Статус и источник</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Источник брони</label>
            <select {...register('source')} className="input-field">
              <option value="PHONE">Телефон</option>
              <option value="ADMIN">Администратор</option>
              <option value="OTHER">Другое</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Статус брони</label>
            <select {...register('status')} className="input-field font-sans">
              <option value="PENDING">На согласовании</option>
              <option value="CONFIRMED">Согласован</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Статус оплаты</label>
            <select {...register('paymentStatus')} className="input-field font-sans">
              <option value="UNPAID">Не оплачено</option>
              <option value="DEPOSIT_PAID">Внесена предоплата</option>
              <option value="FULLY_PAID">Оплачено</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Заметки администратора</label>
          <textarea {...register('adminNotes')} rows={2} className="input-field resize-none" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать бронь'}
      </button>
    </form>
  )
}
