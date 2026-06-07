import { SiteFooter } from '@/components/layout/SiteFooter'
import {
  getSettings,
  buildBookingDocuments,
  FOOTER_SETTING_KEYS,
  DOCUMENT_SETTING_KEYS,
} from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings([...FOOTER_SETTING_KEYS, ...DOCUMENT_SETTING_KEYS])
  const documents = buildBookingDocuments(settings)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <SiteFooter
        orgName={settings.org_name}
        orgInn={settings.org_inn}
        phone={settings.site_phone}
        email={settings.site_email}
        address={settings.site_address}
        documents={documents}
      />
    </div>
  )
}
