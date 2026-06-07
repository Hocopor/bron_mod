'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Globe,
  CreditCard,
  FileText,
  Navigation,
  Building2,
  Users,
  KeyRound,
  Trash2,
  Plus,
} from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'

interface AdminUser {
  id: string
  login: string
  role: string
  isActive: boolean
}

interface Props {
  settings: Record<string, string>
  currentRole: 'ADMIN' | 'STAFF'
  currentLogin: string
  users: AdminUser[]
}

export function AdminSettingsForm({ settings, currentRole, currentLogin, users }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [saving, setSaving] = useState<string | null>(null)
  const [vals, setVals] = useState(settings)

  const set = (key: string, value: string) => setVals((prev) => ({ ...prev, [key]: value }))

  const save = async (keys: string[], sectionId: string) => {
    setSaving(sectionId)
    const data: Record<string, string> = {}
    keys.forEach((key) => {
      data[key] = vals[key] ?? ''
    })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      success('Настройки сохранены')
      router.refresh()
    } catch {
      showError('Ошибка сохранения')
    } finally {
      setSaving(null)
    }
  }

  const SaveBtn = ({ keys, sectionId }: { keys: string[]; sectionId: string }) => (
    <button onClick={() => save(keys, sectionId)} disabled={!!saving} className="btn-secondary text-sm py-2 disabled:opacity-60">
      {saving === sectionId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
    </button>
  )

  const Field = ({ k, label, placeholder, hint }: { k: string; label: string; placeholder?: string; hint?: string }) => (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <input value={vals[k] || ''} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className="input-field" />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Контакты и время */}
      <div className="admin-card">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
          <Globe className="h-5 w-5 text-sea-600" /> Контакты и адрес
        </h2>
        <div className="space-y-4">
          <Field k="site_name" label="Название" />
          <Field k="site_phone" label="Телефон" placeholder="+7 (900) 000-00-00" />
          <Field k="site_email" label="Email" placeholder="mail@example.ru" />
          <Field k="site_address" label="Адрес" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Время заезда</label>
              <input value={vals.check_in_time || '14:00'} onChange={(e) => set('check_in_time', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Время выезда</label>
              <input value={vals.check_out_time || '12:00'} onChange={(e) => set('check_out_time', e.target.value)} className="input-field" />
            </div>
          </div>
          <SaveBtn sectionId="contacts" keys={['site_name', 'site_phone', 'site_email', 'site_address', 'check_in_time', 'check_out_time']} />
        </div>
      </div>

      {/* Реквизиты для подвала */}
      <div className="admin-card">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
          <Building2 className="h-5 w-5 text-sea-600" /> Реквизиты (подвал сайта)
        </h2>
        <div className="space-y-4">
          <Field k="org_name" label="Организация / самозанятый" placeholder="Самозанятый Иванов И. И." />
          <Field k="org_inn" label="ИНН" placeholder="000000000000" />
          <SaveBtn sectionId="org" keys={['org_name', 'org_inn']} />
        </div>
      </div>

      {/* Документы для бронирования */}
      <div className="admin-card">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
          <FileText className="h-5 w-5 text-sea-600" /> Документы для бронирования
        </h2>
        <p className="mb-4 text-xs text-gray-400">
          Ссылки на документы, которые гость отмечает галочкой согласия перед бронированием. Без принятия документов бронь не создаётся. Пустые поля не показываются.
        </p>
        <div className="space-y-4">
          <Field k="doc_privacy_url" label="Политика конфиденциальности" placeholder="https://..." />
          <Field k="doc_terms_url" label="Пользовательское соглашение" placeholder="https://..." />
          <Field k="doc_booking_url" label="Условия бронирования" placeholder="https://..." />
          <Field k="doc_consent_url" label="Согласие на обработку персональных данных" placeholder="https://..." />
          <SaveBtn sectionId="docs" keys={['doc_privacy_url', 'doc_terms_url', 'doc_booking_url', 'doc_consent_url']} />
        </div>
      </div>

      {/* Навигация карточки номера */}
      <div className="admin-card">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
          <Navigation className="h-5 w-5 text-sea-600" /> Навигация карточки номера
        </h2>
        <p className="mb-4 text-xs text-gray-400">
          Куда ведут кнопки «На главную» и «Назад» на странице номера (обычно — страницы сайта на Tilda). Если пусто — ведут на каталог объекта.
        </p>
        <div className="space-y-4">
          <Field k="nav_home_url" label="Кнопка «На главную»" placeholder="https://example.ru" />
          <Field k="nav_back_url" label="Кнопка «Назад»" placeholder="https://example.ru/nomera" />
          <SaveBtn sectionId="nav" keys={['nav_home_url', 'nav_back_url']} />
        </div>
      </div>

      {/* Депозит */}
      <div className="admin-card">
        <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
          <CreditCard className="h-5 w-5 text-sea-600" /> Депозит и условия
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs text-gray-500">Тип депозита</label>
            <div className="flex gap-3">
              {['PERCENT', 'FIXED'].map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="deposit_type"
                    value={type}
                    checked={(vals.deposit_type || 'PERCENT') === type}
                    onChange={() => set('deposit_type', type)}
                    className="accent-sea-700"
                  />
                  <span className="text-sm">{type === 'PERCENT' ? 'Процент от стоимости' : 'Фиксированная сумма'}</span>
                </label>
              ))}
            </div>
          </div>
          {(vals.deposit_type || 'PERCENT') === 'PERCENT' ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Процент депозита (%)</label>
              <input type="number" min={1} max={100} value={vals.deposit_percent || '30'} onChange={(e) => set('deposit_percent', e.target.value)} className="input-field w-32" />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Фиксированная сумма (руб.)</label>
              <input
                type="number"
                min={0}
                value={Math.round(parseInt(vals.deposit_fixed || '200000', 10) / 100)}
                onChange={(e) => set('deposit_fixed', String(parseInt(e.target.value || '0', 10) * 100))}
                className="input-field w-40"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Минимальный срок бронирования (ночей)</label>
            <input type="number" min={1} value={vals.min_booking_days || '1'} onChange={(e) => set('min_booking_days', e.target.value)} className="input-field w-24" />
          </div>
          <SaveBtn sectionId="deposit" keys={['deposit_type', 'deposit_percent', 'deposit_fixed', 'min_booking_days']} />
        </div>
      </div>

      {/* Управление доступом — только главный админ */}
      {currentRole === 'ADMIN' && (
        <AccessManagement currentLogin={currentLogin} users={users} />
      )}
    </div>
  )
}

// =================== Управление доступом ===================

function AccessManagement({ currentLogin, users }: { currentLogin: string; users: AdminUser[] }) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  // Свои логин/пароль
  const [accLogin, setAccLogin] = useState(currentLogin)
  const [accPassword, setAccPassword] = useState('')

  const saveAccount = async () => {
    setBusy('account')
    try {
      const payload: Record<string, string> = {}
      if (accLogin && accLogin !== currentLogin) payload.login = accLogin
      if (accPassword) payload.password = accPassword
      if (Object.keys(payload).length === 0) {
        showError('Измените логин или пароль')
        setBusy(null)
        return
      }
      const res = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка сохранения')
      success('Данные входа обновлены')
      setAccPassword('')
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setBusy(null)
    }
  }

  // Создание сотрудника
  const [newLogin, setNewLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'STAFF' | 'ADMIN'>('STAFF')

  const createUser = async () => {
    setBusy('create')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: newLogin, password: newPassword, role: newRole }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка создания')
      success('Сотрудник добавлен')
      setNewLogin('')
      setNewPassword('')
      setNewRole('STAFF')
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setBusy(null)
    }
  }

  const resetPassword = async (user: AdminUser) => {
    const password = window.prompt(`Новый пароль для «${user.login}» (минимум 6 символов):`)
    if (!password) return
    setBusy(`pw-${user.id}`)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка')
      success('Пароль обновлён')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(null)
    }
  }

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Удалить пользователя «${user.login}»?`)) return
    setBusy(`del-${user.id}`)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      success('Пользователь удалён')
      router.refresh()
    } catch {
      showError('Ошибка удаления')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="admin-card">
      <h2 className="mb-5 flex items-center gap-2 font-semibold text-gray-800">
        <KeyRound className="h-5 w-5 text-sea-600" /> Управление доступом
      </h2>

      {/* Свои данные входа */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Мои данные входа (главный админ)</div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Логин</label>
            <input value={accLogin} onChange={(e) => setAccLogin(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Новый пароль</label>
            <input type="password" value={accPassword} onChange={(e) => setAccPassword(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" className="input-field" />
          </div>
          <button onClick={saveAccount} disabled={busy === 'account'} className="btn-primary text-sm disabled:opacity-60">
            {busy === 'account' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить данные входа'}
          </button>
        </div>
      </div>

      {/* Сотрудники */}
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Users className="h-4 w-4 text-sea-600" /> Сотрудники
      </div>

      {users.length === 0 ? (
        <p className="mb-4 text-sm text-gray-400">Сотрудников пока нет.</p>
      ) : (
        <div className="mb-5 space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{user.login}</span>
                  <span className={`badge ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role === 'ADMIN' ? 'Админ' : 'Сотрудник'}
                  </span>
                  {user.login === currentLogin && <span className="badge bg-green-100 text-green-700">вы</span>}
                  {!user.isActive && <span className="badge bg-gray-100 text-gray-500">отключён</span>}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button onClick={() => resetPassword(user)} disabled={busy === `pw-${user.id}`} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" title="Сбросить пароль">
                  {busy === `pw-${user.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                </button>
                {user.login !== currentLogin && (
                  <button onClick={() => deleteUser(user)} disabled={busy === `del-${user.id}`} className="rounded-xl p-2 text-red-500 hover:bg-red-50" title="Удалить">
                    {busy === `del-${user.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Добавить сотрудника */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Добавить сотрудника</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={newLogin} onChange={(e) => setNewLogin(e.target.value)} placeholder="Логин" className="input-field" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Пароль (мин. 6 символов)" className="input-field" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'STAFF' | 'ADMIN')} className="input-field w-44">
            <option value="STAFF">Сотрудник</option>
            <option value="ADMIN">Админ</option>
          </select>
          <button onClick={createUser} disabled={busy === 'create' || !newLogin || newPassword.length < 6} className="btn-primary text-sm disabled:opacity-60">
            {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Добавить</>}
          </button>
        </div>
      </div>
    </div>
  )
}
