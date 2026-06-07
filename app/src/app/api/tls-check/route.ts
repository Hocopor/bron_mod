import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeDomain } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Эндпоинт для Caddy On-Demand TLS (`ask`). Caddy спрашивает разрешение
// выпустить сертификат для домена → отвечаем 200 только если такой домен
// привязан к активному объекту. Иначе 404 — чужие домены не обслуживаем.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('domain') || ''
  const domain = normalizeDomain(raw)

  // Админский домен обслуживается отдельным блоком Caddy, но на всякий случай
  // разрешаем и его (если кто-то настроит on-demand и для него).
  const adminDomain = process.env.ADMIN_DOMAIN
    ? normalizeDomain(process.env.ADMIN_DOMAIN)
    : null

  if (!domain) {
    return NextResponse.json({ error: 'No domain' }, { status: 400 })
  }
  if (adminDomain && domain === adminDomain) {
    return new NextResponse('ok', { status: 200 })
  }

  try {
    const object = await prisma.propertyObject.findFirst({
      where: { domain, isActive: true },
      select: { id: true },
    })
    if (!object) {
      return NextResponse.json({ error: 'Unknown domain' }, { status: 404 })
    }
    return new NextResponse('ok', { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
