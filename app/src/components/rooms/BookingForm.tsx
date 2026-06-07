'use client'

import { useMemo, useState } from 'react'
import { addDays, format, isBefore, isWithinInterval } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DayPicker, DateRange } from 'react-day-picker'
import {
  calculateDeposit,
  cn,
  countNights,
  formatDate,
  formatMoney,
  guestsLabel,
  nightsLabel,
} from '@/lib/utils'
import {
  buildNightlyPriceBreakdown,
  calculateNightlyBreakdownTotal,
  getNightlyPrice,
  normalizeRoomPricePeriods,
} from '@/lib/pricing'
import { useToast } from '@/components/providers/ToastProvider'
import type { BookingDocument } from '@/lib/settings'
import { Calendar, Car, CheckCircle2, Loader2, MessageSquare, PawPrint, User, Users } from 'lucide-react'
import 'react-day-picker/style.css'

const baseSchema = z.object({
  guestName: z.string().min(2, 'Введите имя'),
  guestPhone: z.string().transform((val) => {
    let cleaned = val.trim().replace(/[\s\-\(\)]/g, '')
    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.substring(1)
    }
    return cleaned
  }).refine((val) => /^\+7\d{10}$/.test(val), 'Введите номер телефона корректно в формате +7...'),
  guestEmail: z.string().email('Некорректный email').optional().or(z.literal('')),
  guests: z.number().min(1).max(20),
  hasPets: z.boolean(),
  petsDescription: z.string().optional(),
  smoking: z.boolean(),
  transferNeeded: z.boolean(),
  transferFrom: z.string().optional(),
  transferDate: z.string().optional(),
  transferUnknown: z.boolean(),
  comment: z.string().optional(),
  agreeDocs: z.boolean().optional(),
})

type FormData = z.infer<typeof baseSchema>

interface OccupiedRange {
  from: Date
  to: Date
}

interface DepositSettings {
  type: 'PERCENT' | 'FIXED'
  percent: number
  fixed: number
}

interface RoomPricePeriod {
  pricePerDay: number
  dateFrom: string | Date
  dateTo: string | Date
}

interface Props {
  roomId: string
  roomSlug: string
  roomName: string
  basePricePerDay: number
  pricePeriods: RoomPricePeriod[]
  maxGuests: number
  occupiedRanges: OccupiedRange[]
  documents: BookingDocument[]
  depositSettings: DepositSettings
  minNights: number
}

function stayDaysLabel(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100

  if (mod100 >= 11 && mod100 <= 19) return `${days} дней`
  if (mod10 === 1) return `${days} день`
  if (mod10 >= 2 && mod10 <= 4) return `${days} дня`
  return `${days} дней`
}

function formatDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function formatPriceRangeLabel(startDate: string, endDate: string): string {
  const startLabel = formatDate(startDate, 'dd.MM.yyyy')
  const endLabel = formatDate(endDate, 'dd.MM.yyyy')

  return startDate === endDate ? startLabel : `${startLabel}-${endLabel}`
}

function groupPriceBreakdown(items: Array<{ date: string; pricePerDay: number }>) {
  return items.reduce<Array<{ startDate: string; endDate: string; pricePerDay: number; days: number }>>((groups, item) => {
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.pricePerDay === item.pricePerDay) {
      lastGroup.endDate = item.date
      lastGroup.days += 1
      return groups
    }

    groups.push({
      startDate: item.date,
      endDate: item.date,
      pricePerDay: item.pricePerDay,
      days: 1,
    })

    return groups
  }, [])
}

export function BookingForm({
  roomId,
  roomSlug: _roomSlug,
  roomName: _roomName,
  basePricePerDay,
  pricePeriods,
  maxGuests,
  occupiedRanges,
  documents,
  depositSettings,
  minNights,
}: Props) {
  const { error: showError } = useToast()
  const requiresConsent = documents.length > 0
  const [range, setRange] = useState<DateRange | undefined>()
  const [step, setStep] = useState<'calendar' | 'form'>('calendar')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const schema = useMemo(() => {
    if (!requiresConsent) return baseSchema
    return baseSchema.refine((data) => Boolean(data.agreeDocs), {
      message: 'Необходимо принять документы и дать согласие на обработку персональных данных',
      path: ['agreeDocs'],
    })
  }, [requiresConsent])

  const normalizedPricePeriods = useMemo(
    () => normalizeRoomPricePeriods(pricePeriods || []),
    [pricePeriods],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guests: 1,
      hasPets: false,
      smoking: false,
      transferNeeded: false,
      transferUnknown: false,
      guestName: '',
      guestEmail: '',
    },
  })

  const transferNeeded = watch('transferNeeded')
  const transferUnknown = watch('transferUnknown')
  const hasPets = watch('hasPets')

  const disabledDays = useMemo(() => {
    const disabled: Date[] = []
    // Запрещаем любые даты до начала сегодняшнего дня (вчера и раньше нельзя; сегодня — можно).
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    disabled.push({ before: today } as any)

    occupiedRanges.forEach((occupiedRange) => {
      let currentDay = new Date(occupiedRange.from)
      while (isBefore(currentDay, occupiedRange.to)) {
        disabled.push(new Date(currentDay))
        currentDay = addDays(currentDay, 1)
      }
    })

    return disabled
  }, [occupiedRanges])

  const isRangeOccupied = (from: Date, to: Date): boolean => {
    return occupiedRanges.some((occupiedRange) => (
      isWithinInterval(from, { start: occupiedRange.from, end: addDays(occupiedRange.to, -1) }) ||
      isWithinInterval(to, { start: addDays(occupiedRange.from, 1), end: occupiedRange.to }) ||
      (isBefore(from, occupiedRange.from) && isBefore(occupiedRange.to, to))
    ))
  }

  const nights = range?.from && range?.to ? countNights(range.from, range.to) : 0

  const priceBreakdown = useMemo(() => {
    if (!range?.from || !range?.to || nights < 1) {
      return []
    }

    return buildNightlyPriceBreakdown(
      formatDateInputValue(range.from),
      formatDateInputValue(range.to),
      basePricePerDay,
      normalizedPricePeriods,
    )
  }, [basePricePerDay, nights, normalizedPricePeriods, range?.from, range?.to])

  const groupedPriceBreakdown = useMemo(
    () => groupPriceBreakdown(priceBreakdown),
    [priceBreakdown],
  )

  const rangeModifiers = useMemo(() => {
    if (!range?.from) {
      return {}
    }

    if (!range.to) {
      return {
        selectedStart: range.from,
      }
    }

    const middleDates: Date[] = []
    let current = addDays(range.from, 1)

    while (isBefore(current, range.to)) {
      middleDates.push(new Date(current))
      current = addDays(current, 1)
    }

    return {
      selectedStart: range.from,
      selectedEnd: range.to,
      selectedMiddle: middleDates,
    }
  }, [range?.from, range?.to])

  const totalPrice = priceBreakdown.length > 0 ? calculateNightlyBreakdownTotal(priceBreakdown) : 0
  const depositAmount = calculateDeposit(totalPrice, depositSettings)

  const handleDayClick = (date: Date, modifiers: Record<string, boolean>) => {
    if (modifiers.disabled) {
      return
    }

    if (!range?.from) {
      setRange({ from: date, to: undefined })
      return
    }

    if (range.from && range.to) {
      setRange(undefined)
      return
    }

    const nextRange = date < range.from
      ? { from: date, to: range.from }
      : { from: range.from, to: date }

    if (isRangeOccupied(nextRange.from, nextRange.to)) {
      showError('Выбранный период недоступен — часть дат занята')
      setRange(undefined)
      return
    }

    const selectedNights = countNights(nextRange.from, nextRange.to)
    if (selectedNights < minNights) {
      showError(`Минимальное бронирование — ${minNights} ${nightsLabel(minNights)}`)
    }

    setRange(nextRange)
  }

  const onSubmit = async (data: FormData) => {
    if (!range?.from || !range?.to) {
      showError('Выберите даты заезда и выезда')
      return
    }

    if (nights < minNights) {
      showError(`Минимальный срок — ${minNights} ${nightsLabel(minNights)}`)
      return
    }

    if (requiresConsent && !data.agreeDocs) {
      showError('Необходимо принять документы и дать согласие на обработку персональных данных')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          checkIn: formatDateInputValue(range.from),
          checkOut: formatDateInputValue(range.to),
          ...data,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Ошибка при создании брони')
      }

      setSuccess(true)
    } catch (error: any) {
      showError(error.message || 'Произошла ошибка. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {step === 'calendar' && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-sea-600" />
            Выберите даты заезда и выезда
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <DayPicker
              onDayClick={handleDayClick}
              locale={ru}
              disabled={disabledDays}
              fromDate={new Date()}
              numberOfMonths={1}
              modifiers={rangeModifiers}
              modifiersStyles={{
                selectedMiddle: { backgroundColor: '#dceff8', color: '#285b6a' },
                selectedStart: {
                  background: 'linear-gradient(to right, transparent 0, transparent 50%, #dceff8 50%, #dceff8 100%)',
                },
                selectedEnd: {
                  background: 'linear-gradient(to right, #dceff8 0, #dceff8 50%, transparent 50%, transparent 100%)',
                },
              }}
              components={{
                DayButton: ({ day, modifiers, children, ...buttonProps }: any) => {
                  const date = day.date as Date
                  const disabled = Boolean(modifiers?.disabled)
                  const dailyPrice = getNightlyPrice(basePricePerDay, normalizedPricePeriods, date)
                  const isBoundary = Boolean(
                    modifiers?.selectedStart ||
                    modifiers?.selectedEnd,
                  )
                  const isRangeMiddle = Boolean(modifiers?.selectedMiddle)

                  return (
                    <button
                      {...buttonProps}
                      type="button"
                      className={cn(
                        'relative z-10 flex h-[46px] w-[46px] flex-col items-center justify-center rounded-full border border-transparent transition-colors',
                        isBoundary
                          ? 'border-[#ebd07b] bg-[#f6e3a2] text-[#5b4715] shadow-[0_4px_14px_rgba(210,175,76,0.28)]'
                          : 'bg-transparent text-gray-700 hover:bg-[#edf7fb]',
                        isRangeMiddle && !isBoundary ? 'text-[#285b6a]' : '',
                      )}
                    >
                      <div className="flex min-h-[46px] w-full flex-col items-center justify-center leading-none">
                        <span className="text-[12px]">{children}</span>
                        {!disabled && (
                          <span className={cn('mt-1 text-[9px]', isBoundary ? 'text-[#6b5720]' : 'text-gray-500')}>
                            {Math.round(dailyPrice / 100)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                },
              }}
              styles={{
                root: {
                  margin: '0 auto 0 0',
                  fontFamily: 'Nunito, sans-serif',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0 0 6px 0',
                  ['--rdp-day-width' as any]: '46px',
                  ['--rdp-day-height' as any]: '48px',
                  ['--rdp-day_button-width' as any]: '46px',
                  ['--rdp-day_button-height' as any]: '46px',
                },
                month_caption: { padding: '0 4px 8px' },
                nav: { paddingInline: '6px' },
                cell: { padding: 0, height: '48px' },
                day: { height: '48px', width: '46px', padding: 0 },
                weekday: { width: '46px' },
                month_grid: { marginRight: '10px' },
                chevron: { color: '#1a6b8a' },
                button_previous: { color: '#1a6b8a' },
                button_next: { color: '#1a6b8a' },
                selected: { backgroundColor: 'transparent', color: 'inherit' },
              }}
            />
          </div>

          {range?.from && range?.to && (
            <div className="mt-4 rounded-2xl border border-sea-100 bg-sea-50 p-4">
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="mb-0.5 text-xs text-gray-400">Заезд</div>
                  <div className="font-semibold text-gray-900">{formatDate(range.from)}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-xs text-gray-400">Выезд</div>
                  <div className="font-semibold text-gray-900">{formatDate(range.to)}</div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-sea-200 pt-3">
                {groupedPriceBreakdown.map((item) => {
                  const formattedRange = formatPriceRangeLabel(item.startDate, item.endDate)

                  return (
                    <div key={`${item.startDate}-${item.endDate}-${item.pricePerDay}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                      <span className="col-span-2 overflow-x-auto whitespace-nowrap text-gray-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {formattedRange} — по {formatMoney(item.pricePerDay)}/сутки
                      </span>
                      <span />
                      <span className="whitespace-nowrap text-right font-medium">{stayDaysLabel(item.days)}</span>
                    </div>
                  )
                })}

                <div className="flex justify-between pt-1 text-sm">
                  <span className="text-gray-500">{stayDaysLabel(nights)}</span>
                  <span className="font-semibold">{formatMoney(totalPrice)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Депозит ({depositSettings.type === 'PERCENT' ? `${depositSettings.percent}%` : 'фиксированный'})
                  </span>
                  <span className="font-semibold text-coral-600">{formatMoney(depositAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {nights >= minNights && (
            <button
              type="button"
              onClick={() => setStep('form')}
              className="btn-primary mt-4 w-full justify-center"
            >
              Продолжить оформление
            </button>
          )}
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-sea-100 bg-sea-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('calendar')}
                className="text-sm font-medium text-sea-700 hover:underline"
              >
                ← Изменить даты
              </button>
              <span className="text-sm font-semibold text-sea-700">{formatMoney(depositAmount)} депозит</span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(range!.from!)} — {formatDate(range!.to!)} · {stayDaysLabel(nights)} · итого {formatMoney(totalPrice)}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <User className="h-4 w-4 text-sea-600" /> Данные гостя
            </h3>
            <div>
              <input {...register('guestName')} placeholder="Имя и фамилия *" className="input-field" />
              {errors.guestName && <p className="mt-1 text-xs text-red-500">{errors.guestName.message}</p>}
            </div>
            <div>
              <input {...register('guestPhone')} placeholder="Номер телефона *" type="tel" className="input-field" />
              {errors.guestPhone && <p className="mt-1 text-xs text-red-500">{errors.guestPhone.message}</p>}
            </div>
            <div>
              <input {...register('guestEmail')} placeholder="Email (необязательно)" type="email" className="input-field" />
              {errors.guestEmail && <p className="mt-1 text-xs text-red-500">{errors.guestEmail.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <Users className="h-4 w-4 text-sea-600" /> О проживании
            </h3>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Количество гостей *</label>
              <select {...register('guests', { valueAsNumber: true })} className="input-field">
                {Array.from({ length: maxGuests }, (_, index) => index + 1).map((guestCount) => (
                  <option key={guestCount} value={guestCount}>{guestsLabel(guestCount)}</option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-3">
              <input type="checkbox" {...register('hasPets')} className="h-4 w-4 rounded accent-sea-700" />
              <span className="flex items-center gap-1.5 text-sm">
                <PawPrint className="h-4 w-4 text-gray-400" /> Есть домашние животные
              </span>
            </label>

            {hasPets && (
              <input
                {...register('petsDescription')}
                placeholder="Опишите питомца (порода, размер)"
                className="input-field"
              />
            )}

            <label className="flex cursor-pointer select-none items-center gap-3">
              <input type="checkbox" {...register('smoking')} className="h-4 w-4 rounded accent-sea-700" />
              <span className="text-sm text-gray-700">Есть курящие среди гостей</span>
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <Car className="h-4 w-4 text-sea-600" /> Трансфер
            </h3>
            <label className="flex cursor-pointer select-none items-center gap-3">
              <input type="checkbox" {...register('transferNeeded')} className="h-4 w-4 rounded accent-sea-700" />
              <span className="text-sm text-gray-700">Нужен трансфер (платно, стоимость уточняется)</span>
            </label>

            {transferNeeded && (
              <div className="space-y-3 pl-7">
                <label className="flex cursor-pointer select-none items-center gap-3">
                  <input type="checkbox" {...register('transferUnknown')} className="h-4 w-4 rounded accent-sea-700" />
                  <span className="text-sm text-gray-600">Пока не знаю откуда</span>
                </label>

                {!transferUnknown && (
                  <>
                    <input
                      {...register('transferFrom')}
                      placeholder="Откуда забрать (город, адрес, вокзал)"
                      className="input-field"
                    />
                    <input
                      {...register('transferDate')}
                      type="datetime-local"
                      className="input-field"
                      min={range?.from ? `${formatDateInputValue(range.from)}T00:00` : undefined}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
              <MessageSquare className="h-4 w-4 text-sea-600" /> Комментарий
            </h3>
            <textarea
              {...register('comment')}
              placeholder="Пожелания, вопросы, особые требования..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="rounded-2xl border border-sand-200 bg-sand-100 p-4 text-sm text-gray-600">
            <p className="mb-1 font-medium text-gray-800">Условия оплаты</p>
            <p>
              Сейчас оплачивается депозит <strong>{formatMoney(depositAmount)}</strong>. Оставшаяся сумма{' '}
              <strong>{formatMoney(totalPrice - depositAmount)}</strong> оплачивается при заезде.
            </p>
          </div>

          {requiresConsent && (
            <div className="space-y-2">
              <label className="flex cursor-pointer select-none items-start gap-3">
                <input
                  type="checkbox"
                  {...register('agreeDocs')}
                  className="mt-1 h-4 w-4 rounded accent-sea-700 flex-shrink-0"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Я ознакомлен(а) и принимаю:{' '}
                  {documents.map((doc, index) => (
                    <span key={doc.key}>
                      <Link
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sea-700 underline"
                      >
                        {doc.label}
                      </Link>
                      {index < documents.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </label>
              {errors.agreeDocs && <p className="text-xs text-red-500">{errors.agreeDocs.message}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Создаём бронь...
              </>
            ) : (
              'Забронировать'
            )}
          </button>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 mb-2">Бронирование оформлено!</h3>
            <p className="text-sm text-gray-500 mb-6">
              В ближайшее время с вами свяжутся по указанному номеру телефона.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary w-full justify-center"
            >
              Ок
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
