import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'
import type { BookingDocument } from '@/lib/settings'

interface Props {
  orgName?: string
  orgInn?: string
  phone?: string
  email?: string
  address?: string
  documents: BookingDocument[]
}

// Подвал витрины: реквизиты оператора, контакты и ссылки на документы.
// Данные приходят из настроек админки (см. FOOTER_SETTING_KEYS / DOCUMENT_SETTING_KEYS).
export function SiteFooter({ orgName, orgInn, phone, email, address, documents }: Props) {
  const year = new Date().getFullYear()
  const hasContacts = Boolean(phone || email || address)

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Реквизиты */}
          <div>
            <div className="font-display text-base font-semibold text-gray-900">
              {orgName || 'Бронирование'}
            </div>
            {orgInn && <div className="mt-1 text-sm text-gray-500">ИНН {orgInn}</div>}
          </div>

          {/* Контакты */}
          {hasContacts && (
            <div className="space-y-2 text-sm text-gray-600">
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 hover:text-sea-700">
                  <Phone className="h-4 w-4 flex-shrink-0 text-sea-600" /> {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-sea-700">
                  <Mail className="h-4 w-4 flex-shrink-0 text-sea-600" /> {email}
                </a>
              )}
              {address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sea-600" /> {address}
                </div>
              )}
            </div>
          )}

          {/* Документы */}
          {documents.length > 0 && (
            <div className="space-y-2 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Документы</div>
              {documents.map((doc) => (
                <Link
                  key={doc.key}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-sea-700 hover:underline"
                >
                  {doc.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-gray-100 pt-5 text-xs text-gray-400">
          © {year} {orgName || ''}. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
