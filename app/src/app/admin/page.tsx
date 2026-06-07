import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Дашборд/аналитика не нужны (вырезаны). Главная админки — «Бронирования».
export default function AdminIndexPage() {
  redirect('/admin/bookings')
}
