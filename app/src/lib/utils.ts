import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns'
import { ru } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(kopecks: number): string {
  return `${(kopecks / 100).toLocaleString('ru-RU')} ₽`
}

export function formatMoneyRange(minKopecks: number, maxKopecks: number): string {
  const min = (minKopecks / 100).toLocaleString('ru-RU')
  const max = (maxKopecks / 100).toLocaleString('ru-RU')
  return `${min}-${max} ₽`
}

export function formatDate(date: Date | string, pattern = 'd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, pattern, { locale: ru })
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'd MMM')
}

export function countNights(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn)
}

export function calculateTotalPrice(pricePerDay: number, nights: number): number {
  return pricePerDay * nights
}

export function calculateDeposit(
  totalPrice: number,
  settings: { type: 'PERCENT' | 'FIXED'; percent: number; fixed: number },
): number {
  if (settings.type === 'PERCENT') {
    return Math.round(totalPrice * (settings.percent / 100))
  }
  return Math.min(settings.fixed, totalPrice)
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trimEnd() + '…'
}

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'На согласовании',
    CONFIRMED: 'Согласован',
    CANCELLED: 'Отменено',
    COMPLETED: 'Завершено',
  }
  return labels[status] || status
}

export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    UNPAID: 'Не оплачено',
    DEPOSIT_PAID: 'Депозит оплачен',
    FULLY_PAID: 'Полностью оплачено',
    REFUNDED: 'Возврат',
    PARTIAL_REFUND: 'Частичный возврат',
  }
  return labels[status] || status
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    CONFIRMED: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
    CANCELLED: 'bg-red-50 text-red-800 border border-red-200',
    COMPLETED: 'bg-blue-50 text-blue-800 border border-blue-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200'
}

export function getUnifiedStatusLabel(status: string, paymentStatus: string, checkOut?: Date | string | null): string {
  if (status === 'CANCELLED') return 'Отменено'
  if (status === 'COMPLETED') return 'Завершено'
  if (status === 'PENDING') return 'На согласовании'
  
  if (status === 'CONFIRMED') {
    if (checkOut) {
      const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut
      const now = new Date()
      const endOfCheckout = new Date(checkOutDate)
      endOfCheckout.setHours(23, 59, 59, 999)
      if (now > endOfCheckout && paymentStatus === 'FULLY_PAID') {
        return 'Завершено'
      }
    }
    
    if (paymentStatus === 'FULLY_PAID') return 'Оплачено'
    if (paymentStatus === 'DEPOSIT_PAID') return 'Внесена предоплата'
    return 'Согласован'
  }
  
  return status
}

export function getUnifiedStatusColor(status: string, paymentStatus: string, checkOut?: Date | string | null): string {
  const lbl = getUnifiedStatusLabel(status, paymentStatus, checkOut)
  if (lbl === 'На согласовании') return 'bg-yellow-50 text-yellow-850 border border-yellow-250 font-semibold'
  if (lbl === 'Согласован') return 'bg-indigo-50 text-indigo-850 border border-indigo-200 font-semibold'
  if (lbl === 'Внесена предоплата') return 'bg-sky-50 text-sky-850 border border-sky-200 font-semibold'
  if (lbl === 'Оплачено') return 'bg-emerald-50 text-emerald-850 border border-emerald-250 font-semibold'
  if (lbl === 'Завершено') return 'bg-blue-50 text-blue-850 border border-blue-200 font-semibold'
  if (lbl === 'Отменено') return 'bg-red-50 text-red-800 border border-red-200 font-medium'
  return 'bg-gray-100 text-gray-800 border border-gray-200 font-medium pb-px'
}

export function pluralize(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 19) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

// e.g. pluralize(5, ['ночь', 'ночи', 'ночей']) => 'ночей'
export function nightsLabel(n: number): string {
  return `${n} ${pluralize(n, ['ночь', 'ночи', 'ночей'])}`
}

export function guestsLabel(n: number): string {
  return `${n} ${pluralize(n, ['гость', 'гостя', 'гостей'])}`
}

export function isAdmin(role?: string | null): boolean {
  return role === 'ADMIN'
}

export function getRoomCapacityBreakdown(baseCapacity: number, extraCapacity: number): string {
  const total = Math.max(0, baseCapacity || 0) + Math.max(0, extraCapacity || 0)
  return `до ${total} чел.`
}

// amenities в БД — свободный список строк (Json). На случай данных-наследия из донора
// (объект-флаги) поддерживаем обе формы и приводим к массиву строк.
const LEGACY_AMENITY_LABELS: Record<string, string> = {
  shower: 'Душ',
  toilet: 'Туалет',
  ac: 'Кондиционер',
  tv: 'Телевизор',
  fridge: 'Холодильник',
  wifi: 'Wi-Fi',
  privateKitchen: 'Своя кухня',
  sharedKitchen: 'Общая кухня',
  veranda: 'Веранда',
  sofa: 'Диван',
}

export function normalizeAmenities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => LEGACY_AMENITY_LABELS[key] || key)
  }

  return []
}

export function generateBookingNumber(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const PHONE_REGEX =
  /^(\+7|8)[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})$/

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  return phone
}

export function getDaysUntilCheckIn(checkIn: Date): number {
  return differenceInCalendarDays(checkIn, new Date())
}
