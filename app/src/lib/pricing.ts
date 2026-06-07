import { addDays, isBefore } from 'date-fns'

export interface RoomPricePeriodInput {
  pricePerDay: number
  dateFrom: string | Date
  dateTo: string | Date
}

export interface NormalizedRoomPricePeriod {
  pricePerDay: number
  dateFrom: Date
  dateTo: Date
}

export interface NightlyPriceItem {
  date: string
  pricePerDay: number
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error('Invalid date format, expected YYYY-MM-DD')
  }

  const [, year, month, day] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function normalizeRoomPricePeriods(periods: RoomPricePeriodInput[]): NormalizedRoomPricePeriod[] {
  return periods
    .map((period) => {
      const numericPrice = typeof period.pricePerDay === 'string'
        ? Number.parseInt(period.pricePerDay, 10)
        : period.pricePerDay

      if (!period || !Number.isFinite(numericPrice) || numericPrice <= 0) {
        return null
      }

      return {
        pricePerDay: Math.round(numericPrice),
        dateFrom: parseDateOnly(period.dateFrom),
        dateTo: parseDateOnly(period.dateTo),
      }
    })
    .filter((period): period is NormalizedRoomPricePeriod => Boolean(period))
    .sort((a, b) => a.dateFrom.getTime() - b.dateFrom.getTime())
}

export function validateRoomPricePeriods(periods: NormalizedRoomPricePeriod[]): string | null {
  for (const period of periods) {
    if (period.dateTo.getTime() < period.dateFrom.getTime()) {
      return 'Дата окончания периода не может быть раньше даты начала.'
    }
  }

  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1]
    const current = periods[index]

    if (current.dateFrom.getTime() <= previous.dateTo.getTime()) {
      return 'Периоды цен не должны пересекаться.'
    }
  }

  return null
}

export function getNightlyPrice(
  basePricePerDay: number,
  periods: NormalizedRoomPricePeriod[],
  date: Date | string,
): number {
  const normalizedDate = parseDateOnly(date)
  const timestamp = normalizedDate.getTime()
  const matchingPeriod = periods.find(
    (period) => timestamp >= period.dateFrom.getTime() && timestamp <= period.dateTo.getTime(),
  )

  return matchingPeriod?.pricePerDay ?? basePricePerDay
}

export function buildNightlyPriceBreakdown(
  checkIn: Date | string,
  checkOut: Date | string,
  basePricePerDay: number,
  periods: NormalizedRoomPricePeriod[],
): NightlyPriceItem[] {
  const nights: NightlyPriceItem[] = []
  let current = parseDateOnly(checkIn)
  const end = parseDateOnly(checkOut)

  while (isBefore(current, end)) {
    nights.push({
      date: formatDateOnly(current),
      pricePerDay: getNightlyPrice(basePricePerDay, periods, current),
    })
    current = addDays(current, 1)
  }

  return nights
}

export function calculateNightlyBreakdownTotal(items: NightlyPriceItem[]): number {
  return items.reduce((sum, item) => sum + item.pricePerDay, 0)
}

export function getRoomPriceRange(basePricePerDay: number, periods: NormalizedRoomPricePeriod[]) {
  const prices = [basePricePerDay, ...periods.map((period) => period.pricePerDay)]
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  return {
    minPrice,
    maxPrice,
    hasRange: minPrice !== maxPrice,
  }
}

export function serializeRoomPricePeriods(periods: NormalizedRoomPricePeriod[]) {
  return periods.map((period) => ({
    pricePerDay: period.pricePerDay,
    dateFrom: formatDateOnly(period.dateFrom),
    dateTo: formatDateOnly(period.dateTo),
  }))
}
