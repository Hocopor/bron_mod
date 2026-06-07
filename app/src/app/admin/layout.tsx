import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/lib/admin-auth'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_session')?.value
  const isAuthenticated = token ? await verifyAdminToken(token) : false

  // Login page renders without the admin sidebar nav
  if (!isAuthenticated) {
    return <>{children}</>
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
