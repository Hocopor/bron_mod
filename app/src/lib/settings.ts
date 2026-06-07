import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'

function shouldSkipDatabaseAccess() {
  return !process.env.DATABASE_URL || process.env.SKIP_DB_DURING_BUILD === '1'
}

const getAllSettingsCache = unstable_cache(
  async () => {
    if (shouldSkipDatabaseAccess()) return {} as Record<string, string>
    try {
      const settings = await prisma.setting.findMany()
      return Object.fromEntries(settings.map((s) => [s.key, s.value]))
    } catch {
      return {} as Record<string, string>
    }
  },
  ['all-settings'],
  { revalidate: 60, tags: ['settings'] }
)

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const all = await getAllSettingsCache()
  return Object.fromEntries(keys.map((k) => [k, all[k] ?? '']).filter(([, v]) => v !== ''))
}

export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  if (shouldSkipDatabaseAccess()) return defaultValue
  try {
    const setting = await prisma.setting.findUnique({ where: { key } })
    return setting?.value ?? defaultValue
  } catch {
    return defaultValue
  }
}

export async function updateSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

// ==== Депозит ====

export async function getDepositSettings(): Promise<{
  type: 'PERCENT' | 'FIXED'
  percent: number
  fixed: number
}> {
  const settings = await getSettings(['deposit_type', 'deposit_percent', 'deposit_fixed'])
  return {
    type: (settings.deposit_type as 'PERCENT' | 'FIXED') || 'PERCENT',
    percent: parseInt(settings.deposit_percent || '30'),
    fixed: parseInt(settings.deposit_fixed || '200000'),
  }
}

export function calculateDeposit(
  totalPrice: number,
  settings: { type: 'PERCENT' | 'FIXED'; percent: number; fixed: number }
): number {
  if (settings.type === 'PERCENT') {
    return Math.round(totalPrice * (settings.percent / 100))
  }
  return Math.min(settings.fixed, totalPrice)
}

// ==== Подвал: соцсети/контакты ====

export type SocialKind = 'vk' | 'whatsapp' | 'telegram'
export interface FooterSocial {
  kind: SocialKind
  url: string
}

export const SOCIAL_SETTING_KEYS = [
  'social_vk_enabled', 'social_vk_url',
  'social_whatsapp_enabled', 'social_whatsapp_url',
  'social_telegram_enabled', 'social_telegram_url',
]

function normalizeSocialUrl(kind: SocialKind, value: string): string {
  const trimmed = value.trim()
  if (kind === 'whatsapp') {
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const digits = trimmed.replace(/\D/g, '')
    return digits ? `https://wa.me/${digits}` : trimmed
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

// Собирает список соцсетей для подвала: только включённые и с непустой ссылкой.
export function buildFooterSocials(settings: Record<string, string>): FooterSocial[] {
  const kinds: SocialKind[] = ['vk', 'whatsapp', 'telegram']
  const result: FooterSocial[] = []
  for (const kind of kinds) {
    if (settings[`social_${kind}_enabled`] !== 'true') continue
    const raw = (settings[`social_${kind}_url`] || '').trim()
    if (!raw) continue
    result.push({ kind, url: normalizeSocialUrl(kind, raw) })
  }
  return result
}

// ==== Документы / реквизиты (подвал и согласие при бронировании) ====

export const FOOTER_SETTING_KEYS = [
  'org_name',            // «ИП ...», «Самозанятый ...», «ООО ...»
  'org_inn',
  'site_phone',
  'site_email',
  'site_address',
  'nav_home_url',        // куда ведёт кнопка «На главную» на карточке номера
  'nav_back_url',        // куда ведёт кнопка «Назад»
  'check_in_time',
  'check_out_time',
]

// Ключи документов, которые гость должен принять при бронировании (галочка согласия).
// Значение — URL документа; пустое = документ не используется.
export const DOCUMENT_SETTING_KEYS = [
  'doc_privacy_url',     // Политика конфиденциальности
  'doc_terms_url',       // Пользовательское соглашение / условия
  'doc_booking_url',     // Условия бронирования
  'doc_consent_url',     // Согласие на обработку перс. данных
]

export interface BookingDocument {
  key: string
  label: string
  url: string
}

const DOCUMENT_LABELS: Record<string, string> = {
  doc_privacy_url: 'Политика конфиденциальности',
  doc_terms_url: 'Пользовательское соглашение',
  doc_booking_url: 'Условия бронирования',
  doc_consent_url: 'Согласие на обработку персональных данных',
}

// Список заполненных документов (для галочки согласия и подвала).
export function buildBookingDocuments(settings: Record<string, string>): BookingDocument[] {
  return DOCUMENT_SETTING_KEYS
    .map((key) => ({ key, label: DOCUMENT_LABELS[key], url: (settings[key] || '').trim() }))
    .filter((doc) => doc.url !== '')
}
