import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin-auth'
import { AdminSettingsForm } from '@/components/admin/AdminSettingsForm'

export const metadata = { title: 'Настройки' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const token = cookies().get('admin_session')?.value
  const session = await getAdminSession(token)
  const isMainAdmin = session?.userRole === 'ADMIN'

  const [settings, users] = await Promise.all([
    prisma.setting.findMany(),
    isMainAdmin
      ? prisma.adminUser.findMany({
          orderBy: { createdAt: 'asc' },
          select: { id: true, login: true, role: true, isActive: true },
        })
      : Promise.resolve([]),
  ])

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-500 text-sm mt-1">Управление сайтом и условиями бронирования</p>
      </div>
      <AdminSettingsForm
        settings={settingsMap}
        currentRole={session?.userRole ?? 'STAFF'}
        currentLogin={session?.login ?? ''}
        users={users}
      />
    </div>
  )
}
