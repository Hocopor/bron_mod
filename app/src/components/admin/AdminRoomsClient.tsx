'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ru } from 'date-fns/locale'
import { DayPicker, DateRange } from 'react-day-picker'
import {
  Waves,
  Edit3,
  Ban,
  Calendar,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Building2,
  ExternalLink,
} from 'lucide-react'
import {
  formatMoney,
  formatDate,
  getBookingStatusColor,
  getBookingStatusLabel,
  getRoomCapacityBreakdown,
  normalizeAmenities,
} from '@/lib/utils'
import {
  getRoomPriceRange,
  normalizeRoomPricePeriods,
  validateRoomPricePeriods,
} from '@/lib/pricing'
import { useToast } from '@/components/providers/ToastProvider'
import { AdminFileDropzone } from '@/components/admin/AdminFileDropzone'
import { AppImage } from '@/components/ui/AppImage'
import 'react-day-picker/style.css'

interface Booking {
  checkIn: Date
  checkOut: Date
  guestName: string
  status: string
}

interface BlockedDate {
  id: string
  dateFrom: Date
  dateTo: Date
  reason?: string | null
}

interface RoomPricePeriod {
  pricePerDay: number
  dateFrom: string | Date
  dateTo: string | Date
}

interface Room {
  id: string
  objectId: string
  name: string
  slug: string
  description: string
  shortDescription: string
  baseCapacity: number
  extraCapacity: number
  capacity: number
  area: number | null
  floor: number | null
  pricePerDay: number
  pricePeriods: RoomPricePeriod[]
  images: string[]
  amenities: unknown
  isActive: boolean
  sortOrder: number
  _count: { bookings: number }
  blockedDates: BlockedDate[]
  bookings: Booking[]
}

interface PropertyObject {
  id: string
  name: string
  slug: string
  description: string | null
  address: string | null
  publicUrl: string | null
  isActive: boolean
  sortOrder: number
  _count: { rooms: number }
  rooms: Room[]
}

interface EditableRoomPricePeriod {
  pricePerDay: string
  dateFrom: string
  dateTo: string
}

function normalizePricePeriodDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function buildEditablePricePeriods(periods: RoomPricePeriod[]): EditableRoomPricePeriod[] {
  return periods.map((period) => ({
    pricePerDay: String(Math.round(period.pricePerDay / 100)),
    dateFrom: normalizePricePeriodDate(period.dateFrom),
    dateTo: normalizePricePeriodDate(period.dateTo),
  }))
}

function isPricePeriodEmpty(period: EditableRoomPricePeriod): boolean {
  return !period.pricePerDay.trim() && !period.dateFrom.trim() && !period.dateTo.trim()
}

function isPricePeriodComplete(period: EditableRoomPricePeriod): boolean {
  return Boolean(period.pricePerDay.trim() && period.dateFrom.trim() && period.dateTo.trim())
}

type ObjectDraft = {
  id?: string
  name: string
  slug: string
  address: string
  publicUrl: string
  description: string
  sortOrder: string
}

type RoomModalState = {
  mode: 'create' | 'edit'
  objectId: string
  room?: Room
}

export function AdminRoomsClient({ objects }: { objects: PropertyObject[] }) {
  const router = useRouter()
  const { success, error: showError } = useToast()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // ---- Объекты ----
  const [objectDraft, setObjectDraft] = useState<ObjectDraft | null>(null)

  // ---- Номера ----
  const [roomModal, setRoomModal] = useState<RoomModalState | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const [pricePeriodsError, setPricePeriodsError] = useState<string | null>(null)

  // ---- Блокировки дат ----
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [blockRange, setBlockRange] = useState<DateRange | undefined>()
  const [blockReason, setBlockReason] = useState('')

  const toggleObject = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  // =================== Объекты ===================

  const startCreateObject = () =>
    setObjectDraft({ name: '', slug: '', address: '', publicUrl: '', description: '', sortOrder: '0' })

  const startEditObject = (object: PropertyObject) =>
    setObjectDraft({
      id: object.id,
      name: object.name,
      slug: object.slug,
      address: object.address ?? '',
      publicUrl: object.publicUrl ?? '',
      description: object.description ?? '',
      sortOrder: String(object.sortOrder),
    })

  const saveObject = async () => {
    if (!objectDraft) return
    if (!objectDraft.name.trim()) {
      showError('Укажите название объекта')
      return
    }

    setSavingId('object')
    try {
      const isEdit = Boolean(objectDraft.id)
      const res = await fetch(isEdit ? `/api/admin/objects/${objectDraft.id}` : '/api/admin/objects', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: objectDraft.name,
          slug: objectDraft.slug || undefined,
          address: objectDraft.address,
          publicUrl: objectDraft.publicUrl,
          description: objectDraft.description,
          sortOrder: parseInt(objectDraft.sortOrder || '0', 10) || 0,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Ошибка сохранения объекта')

      success(isEdit ? 'Объект обновлён' : 'Объект создан')
      setObjectDraft(null)
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка сохранения объекта')
    } finally {
      setSavingId(null)
    }
  }

  const deleteObject = async (object: PropertyObject) => {
    if (!window.confirm(`Удалить объект «${object.name}» вместе со всеми его номерами?`)) return

    setSavingId(`object-del-${object.id}`)
    try {
      const res = await fetch(`/api/admin/objects/${object.id}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Ошибка удаления объекта')
      success('Объект удалён')
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления объекта')
    } finally {
      setSavingId(null)
    }
  }

  // =================== Номера ===================

  const startCreateRoom = (objectId: string) => {
    setRemovedImageUrls([])
    setPricePeriodsError(null)
    setEditForm({
      name: '',
      slug: '',
      shortDescription: '',
      description: '',
      pricePerDay: 0,
      baseCapacity: 2,
      extraCapacity: 0,
      area: '',
      floor: '',
      sortOrder: 0,
      amenitiesText: '',
      images: [],
      pricePeriods: [],
    })
    setRoomModal({ mode: 'create', objectId })
  }

  const startEditRoom = (room: Room) => {
    setRemovedImageUrls([])
    setPricePeriodsError(null)
    setEditForm({
      objectId: room.objectId,
      name: room.name,
      slug: room.slug,
      shortDescription: room.shortDescription,
      description: room.description,
      pricePerDay: Math.round(room.pricePerDay / 100),
      baseCapacity: room.baseCapacity ?? room.capacity,
      extraCapacity: room.extraCapacity ?? 0,
      area: room.area ?? '',
      floor: room.floor ?? '',
      sortOrder: room.sortOrder,
      amenitiesText: normalizeAmenities(room.amenities).join('\n'),
      images: [...room.images],
      pricePeriods: buildEditablePricePeriods(room.pricePeriods || []),
    })
    setRoomModal({ mode: 'edit', objectId: room.objectId, room })
  }

  const closeRoomModal = () => {
    setRoomModal(null)
    setRemovedImageUrls([])
    setPricePeriodsError(null)
  }

  const uploadFiles = async (files: File[], folder: string) => {
    const uploadedUrls: string[] = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки файла')
      uploadedUrls.push(data.url)
    }
    return uploadedUrls
  }

  const deleteUploadedFile = async (url: string) => {
    if (!url.startsWith('/uploads/')) return
    await fetch('/api/admin/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  const setPricePeriods = (updater: (periods: EditableRoomPricePeriod[]) => EditableRoomPricePeriod[]) => {
    setEditForm((prev) => ({ ...prev, pricePeriods: updater([...(prev.pricePeriods || [])]) }))
    setPricePeriodsError(null)
  }

  const handleRoomImageUpload = async (files: File[]) => {
    setSavingId('room-images')
    try {
      const folder = `rooms/${editForm.slug || 'new'}`
      const uploaded = await uploadFiles(files, folder)
      setEditForm((prev) => ({ ...prev, images: [...(prev.images || []), ...uploaded] }))
      success(`Загружено файлов: ${uploaded.length}`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка загрузки изображений')
    } finally {
      setSavingId(null)
    }
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    setEditForm((prev) => {
      const images = [...(prev.images || [])]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= images.length) return prev
      const [item] = images.splice(index, 1)
      images.splice(nextIndex, 0, item)
      return { ...prev, images }
    })
  }

  const removeImage = (index: number) => {
    setEditForm((prev) => {
      const images = [...(prev.images || [])]
      const [removed] = images.splice(index, 1)
      if (removed?.startsWith('/uploads/')) {
        setRemovedImageUrls((current) => [...current, removed])
      }
      return { ...prev, images }
    })
  }

  const saveRoom = async () => {
    if (!roomModal) return
    if (!editForm.name?.trim()) {
      showError('Укажите название номера')
      return
    }

    // Подготовка периодов цен (только для редактирования; POST создаёт без периодов).
    let serializedPricePeriods: Array<{ pricePerDay: number; dateFrom: string; dateTo: string }> = []
    const nonEmptyPeriods = (editForm.pricePeriods || []).filter((p: EditableRoomPricePeriod) => !isPricePeriodEmpty(p))
    const incompletePeriods = nonEmptyPeriods.filter((p: EditableRoomPricePeriod) => !isPricePeriodComplete(p))
    if (incompletePeriods.length > 0) {
      const msg = 'Заполните цену и обе даты для каждого непустого периода.'
      setPricePeriodsError(msg)
      showError(msg)
      return
    }
    try {
      const normalized = normalizeRoomPricePeriods(
        nonEmptyPeriods.map((p: EditableRoomPricePeriod) => ({
          pricePerDay: parseInt(p.pricePerDay || '0', 10) * 100,
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
        })),
      )
      const validationError = validateRoomPricePeriods(normalized)
      if (validationError) {
        setPricePeriodsError(validationError)
        showError(validationError)
        return
      }
      serializedPricePeriods = normalized.map((p) => ({
        pricePerDay: p.pricePerDay,
        dateFrom: p.dateFrom.toISOString().slice(0, 10),
        dateTo: p.dateTo.toISOString().slice(0, 10),
      }))
    } catch {
      const msg = 'Проверьте периоды цен: укажите цену и корректные даты.'
      setPricePeriodsError(msg)
      showError(msg)
      return
    }

    const amenities = String(editForm.amenitiesText || '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)

    const basePayload = {
      name: editForm.name,
      slug: editForm.slug || undefined,
      shortDescription: editForm.shortDescription,
      description: editForm.description,
      pricePerDay: parseInt(editForm.pricePerDay || '0', 10) * 100,
      baseCapacity: Math.max(0, parseInt(editForm.baseCapacity || '1', 10) || 0),
      extraCapacity: Math.max(0, parseInt(editForm.extraCapacity || '0', 10) || 0),
      area: editForm.area === '' ? null : parseInt(editForm.area || '0', 10),
      floor: editForm.floor === '' ? null : parseInt(editForm.floor || '0', 10),
      sortOrder: parseInt(editForm.sortOrder || '0', 10) || 0,
      amenities,
      images: editForm.images || [],
    }

    setSavingId('room-save')
    try {
      const isEdit = roomModal.mode === 'edit' && roomModal.room
      const res = await fetch(isEdit ? `/api/admin/rooms/${roomModal.room!.id}` : '/api/admin/rooms', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { ...basePayload, objectId: editForm.objectId, pricePeriods: serializedPricePeriods }
            : { ...basePayload, objectId: roomModal.objectId },
        ),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Ошибка сохранения номера')

      // Если создавали номер и были периоды цен — досохраняем их через PATCH.
      if (!isEdit && serializedPricePeriods.length > 0 && payload?.id) {
        await fetch(`/api/admin/rooms/${payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pricePeriods: serializedPricePeriods }),
        })
      }

      await Promise.all(removedImageUrls.map((url) => deleteUploadedFile(url)))

      success(isEdit ? 'Номер обновлён' : 'Номер создан')
      closeRoomModal()
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка сохранения номера')
    } finally {
      setSavingId(null)
    }
  }

  const toggleRoomActive = async (room: Room) => {
    setSavingId(`toggle-${room.id}`)
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !room.isActive }),
      })
      if (!res.ok) throw new Error()
      success(room.isActive ? 'Номер скрыт с сайта' : 'Номер активирован')
      router.refresh()
    } catch {
      showError('Ошибка обновления')
    } finally {
      setSavingId(null)
    }
  }

  const deleteRoom = async (room: Room) => {
    if (!window.confirm(`Удалить номер «${room.name}»?`)) return
    setSavingId(`room-del-${room.id}`)
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Ошибка удаления номера')
      success('Номер удалён')
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка удаления номера')
    } finally {
      setSavingId(null)
    }
  }

  // =================== Блокировки ===================

  const saveBlockedDate = async (roomId: string) => {
    if (!blockRange?.from || !blockRange?.to) {
      showError('Выберите период блокировки')
      return
    }
    setSavingId(`block-${roomId}`)
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/blocked-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: blockRange.from.toISOString(),
          dateTo: blockRange.to.toISOString(),
          reason: blockReason || null,
        }),
      })
      if (!res.ok) throw new Error()
      success('Период заблокирован')
      setBlockingId(null)
      setBlockRange(undefined)
      setBlockReason('')
      router.refresh()
    } catch {
      showError('Ошибка блокировки')
    } finally {
      setSavingId(null)
    }
  }

  const removeBlockedDate = async (roomId: string, blockId: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/blocked-dates/${blockId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      success('Блокировка снята')
      router.refresh()
    } catch {
      showError('Ошибка удаления блокировки')
    }
  }

  // =================== Рендер ===================

  return (
    <>
      {objectDraft && renderObjectModal()}
      {roomModal && renderRoomModal()}

      <div className="flex justify-end">
        <button onClick={startCreateObject} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Создать объект
        </button>
      </div>

      {objects.length === 0 && (
        <div className="admin-card text-center text-gray-400">
          Пока нет объектов. Создайте первый объект, затем добавьте в него номера.
        </div>
      )}

      <div className="space-y-5">
        {objects.map((object) => {
          const isOpen = expanded[object.id] ?? true
          return (
            <div key={object.id} className="admin-card">
              {/* Заголовок объекта */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  onClick={() => toggleObject(object.id)}
                  className="flex items-start gap-3 text-left"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-gray-900">{object.name}</h2>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="badge bg-gray-100 text-gray-600">{object._count.rooms} номеров</span>
                      <span className="badge bg-gray-100 text-gray-600">slug: {object.slug}</span>
                      <span className={`badge ${object.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {object.isActive ? 'Активен' : 'Скрыт'}
                      </span>
                      {object.address && <span className="text-xs text-gray-400">{object.address}</span>}
                      {object.publicUrl && (
                        <a
                          href={object.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-sea-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> публичная ссылка
                        </a>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <button onClick={() => startCreateRoom(object.id)} className="btn-secondary text-xs">
                    <Plus className="h-3.5 w-3.5" /> Номер
                  </button>
                  <button onClick={() => startEditObject(object)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" title="Редактировать объект">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteObject(object)}
                    disabled={savingId === `object-del-${object.id}`}
                    className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                    title="Удалить объект"
                  >
                    {savingId === `object-del-${object.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Номера объекта */}
              {isOpen && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                  {object.rooms.length === 0 ? (
                    <p className="text-sm text-gray-400">В объекте пока нет номеров. Нажмите «Номер», чтобы добавить.</p>
                  ) : (
                    object.rooms.map((room) => renderRoomRow(room))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  // ---- Рендер строки номера ----
  function renderRoomRow(room: Room) {
    const isBlocking = blockingId === room.id
    const upcomingBookings = room.bookings.filter((b) => new Date(b.checkIn) >= new Date())
    const priceRange = getRoomPriceRange(room.pricePerDay, normalizeRoomPricePeriods(room.pricePeriods || []))
    const isExpanded = expanded[`room-${room.id}`]

    return (
      <div key={room.id} className={`rounded-2xl border border-gray-100 p-4 ${!room.isActive ? 'opacity-70' : ''}`}>
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-sea-100">
            {room.images[0] ? (
              <AppImage src={room.images[0]} alt={room.name} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Waves className="h-8 w-8 text-sea-300" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{room.name}</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="badge-sea">
                    <Users className="h-3 w-3" /> {getRoomCapacityBreakdown(room.baseCapacity ?? room.capacity, room.extraCapacity ?? 0)}
                  </span>
                  <span className="badge bg-sand-200 text-sand-800">
                    {priceRange.hasRange
                      ? `${formatMoney(priceRange.minPrice)}-${formatMoney(priceRange.maxPrice)} / ночь`
                      : `${formatMoney(priceRange.minPrice)} / ночь`}
                  </span>
                  {room.pricePeriods.length > 0 && (
                    <span className="badge bg-blue-100 text-blue-700">{room.pricePeriods.length} периодов цен</span>
                  )}
                  <span className="badge bg-gray-100 text-gray-600">slug: {room.slug}</span>
                  <span className={`badge ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {room.isActive ? 'Активен' : 'Скрыт'}
                  </span>
                  <span className="badge bg-gray-100 text-gray-600">{room._count.bookings} броней</span>
                  <span className="badge bg-blue-100 text-blue-700">{room.images.length} фото</span>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button onClick={() => startEditRoom(room)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" title="Редактировать">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleRoomActive(room)}
                  disabled={savingId === `toggle-${room.id}`}
                  className={`rounded-xl p-2 ${room.isActive ? 'text-orange-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                  title={room.isActive ? 'Скрыть' : 'Показать'}
                >
                  {savingId === `toggle-${room.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : room.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteRoom(room)}
                  disabled={savingId === `room-del-${room.id}`}
                  className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                  title="Удалить номер"
                >
                  {savingId === `room-del-${room.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setExpanded((prev) => ({ ...prev, [`room-${room.id}`]: !prev[`room-${room.id}`] }))} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-5 border-t border-gray-100 pt-4">
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Полное описание</div>
              <div className="whitespace-pre-wrap">{room.description || '—'}</div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Удобства</div>
              <div className="flex flex-wrap gap-2">
                {normalizeAmenities(room.amenities).length > 0 ? (
                  normalizeAmenities(room.amenities).map((item) => (
                    <span key={item} className="badge bg-white text-gray-700">{item}</span>
                  ))
                ) : (
                  <span className="text-gray-400">Список не заполнен</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="h-4 w-4 text-sea-600" /> Предстоящие брони
              </h4>
              {upcomingBookings.length === 0 ? (
                <p className="text-sm text-gray-400">Нет предстоящих броней</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map((booking, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
                      <span className="font-medium text-gray-800">{booking.guestName}</span>
                      <span className="text-gray-500">{formatDate(booking.checkIn, 'd MMM')} — {formatDate(booking.checkOut, 'd MMM')}</span>
                      <span className={`badge ${getBookingStatusColor(booking.status)}`}>{getBookingStatusLabel(booking.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Ban className="h-4 w-4 text-coral-600" /> Заблокированные периоды
                </h4>
                <button onClick={() => setBlockingId(isBlocking ? null : room.id)} className="flex items-center gap-1 text-xs font-medium text-sea-700 hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Заблокировать период
                </button>
              </div>

              {room.blockedDates.length > 0 && (
                <div className="mb-3 space-y-2">
                  {room.blockedDates.map((blocked) => (
                    <div key={blocked.id} className="flex items-center justify-between rounded-xl border border-coral-100 bg-coral-50 p-3 text-sm">
                      <div>
                        <span className="font-medium text-coral-800">{formatDate(blocked.dateFrom, 'd MMM')} — {formatDate(blocked.dateTo, 'd MMM')}</span>
                        {blocked.reason && <span className="ml-2 text-xs text-coral-600">{blocked.reason}</span>}
                      </div>
                      <button onClick={() => removeBlockedDate(room.id, blocked.id)} className="text-coral-400 hover:text-coral-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isBlocking && (
                <div className="space-y-4 rounded-2xl border border-sea-100 bg-sea-50 p-4">
                  <p className="text-sm text-gray-600">Выберите период для блокировки:</p>
                  <div className="flex justify-center">
                    <DayPicker
                      mode="range"
                      selected={blockRange}
                      onSelect={setBlockRange}
                      locale={ru}
                      fromDate={new Date()}
                      styles={{ root: { margin: 0, fontFamily: 'Nunito, sans-serif', fontSize: '13px' } }}
                    />
                  </div>
                  <input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Причина блокировки (необязательно)"
                    className="input-field text-sm"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => saveBlockedDate(room.id)} disabled={!blockRange?.from || !blockRange?.to || savingId === `block-${room.id}`} className="btn-primary py-2 text-sm disabled:opacity-60">
                      {savingId === `block-${room.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Заблокировать'}
                    </button>
                    <button onClick={() => { setBlockingId(null); setBlockRange(undefined); setBlockReason('') }} className="btn-outline py-2 text-sm">
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Модалка объекта ----
  function renderObjectModal() {
    if (!objectDraft) return null
    const isEdit = Boolean(objectDraft.id)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{isEdit ? 'Редактировать объект' : 'Новый объект'}</h3>
            <button onClick={() => setObjectDraft(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Название *</label>
              <input value={objectDraft.name} onChange={(e) => setObjectDraft({ ...objectDraft, name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Slug / URL (необязательно — создастся из названия)</label>
              <input value={objectDraft.slug} onChange={(e) => setObjectDraft({ ...objectDraft, slug: e.target.value })} className="input-field" placeholder="используется в адресе /o/..." />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Адрес</label>
              <input value={objectDraft.address} onChange={(e) => setObjectDraft({ ...objectDraft, address: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Публичная ссылка (URL «своей» кнопки с сайта Tilda)</label>
              <input value={objectDraft.publicUrl} onChange={(e) => setObjectDraft({ ...objectDraft, publicUrl: e.target.value })} className="input-field" placeholder="https://booking.example.ru/o/..." />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Описание</label>
              <textarea value={objectDraft.description} onChange={(e) => setObjectDraft({ ...objectDraft, description: e.target.value })} rows={3} className="input-field resize-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Сортировка</label>
              <input type="number" value={objectDraft.sortOrder} onChange={(e) => setObjectDraft({ ...objectDraft, sortOrder: e.target.value })} className="input-field w-32" />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={saveObject} disabled={savingId === 'object'} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {savingId === 'object' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
            </button>
            <button onClick={() => setObjectDraft(null)} className="btn-outline">Отмена</button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Модалка номера ----
  function renderRoomModal() {
    if (!roomModal) return null
    const isEdit = roomModal.mode === 'edit'
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{isEdit ? 'Редактировать номер' : 'Новый номер'}</h3>
            <button onClick={closeRoomModal} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-4">
              {isEdit && (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Объект</label>
                  <select value={editForm.objectId} onChange={(e) => setEditForm((prev) => ({ ...prev, objectId: e.target.value }))} className="input-field">
                    {objects.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Название</label>
                <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Slug / URL (необязательно)</label>
                <input value={editForm.slug} onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Короткое описание</label>
                <textarea value={editForm.shortDescription} onChange={(e) => setEditForm((prev) => ({ ...prev, shortDescription: e.target.value }))} rows={3} className="input-field resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Полное описание</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} rows={7} className="input-field resize-none" />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Цена</div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Базовая цена за ночь (₽)</label>
                    <input type="number" min={0} value={editForm.pricePerDay} onChange={(e) => setEditForm((prev) => ({ ...prev, pricePerDay: e.target.value }))} className="input-field" />
                    <p className="mt-1 text-xs text-gray-400">Используется вне специальных периодов.</p>
                  </div>

                  {(editForm.pricePeriods || []).map((period: EditableRoomPricePeriod, index: number) => (
                    <div key={index} className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Цена (₽)</label>
                          <input type="number" min={0} value={period.pricePerDay} onChange={(e) => setPricePeriods((items) => items.map((it, i) => (i === index ? { ...it, pricePerDay: e.target.value } : it)))} className="input-field" />
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">С даты включительно</label>
                            <input type="date" value={period.dateFrom} onChange={(e) => setPricePeriods((items) => items.map((it, i) => (i === index ? { ...it, dateFrom: e.target.value } : it)))} className="input-field" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">По дату включительно</label>
                            <input type="date" value={period.dateTo} onChange={(e) => setPricePeriods((items) => items.map((it, i) => (i === index ? { ...it, dateTo: e.target.value } : it)))} className="input-field" />
                          </div>
                          <div className="flex items-end">
                            <button type="button" onClick={() => setPricePeriods((items) => items.filter((_, i) => i !== index))} className="rounded-xl p-3 text-red-500 hover:bg-red-50" title="Удалить период">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={() => setPricePeriods((items) => [...items, { pricePerDay: '', dateFrom: '', dateTo: '' }])} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-sea-300 px-3 py-2 text-sm font-medium text-sea-700 hover:bg-sea-50">
                    <Plus className="h-4 w-4" /> Добавить период цены
                  </button>

                  {pricePeriodsError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{pricePeriodsError}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Основные места</label>
                  <input type="number" min={0} value={editForm.baseCapacity} onChange={(e) => setEditForm((prev) => ({ ...prev, baseCapacity: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Дополнительные места</label>
                  <input type="number" min={0} value={editForm.extraCapacity} onChange={(e) => setEditForm((prev) => ({ ...prev, extraCapacity: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Площадь (м²)</label>
                  <input type="number" min={0} value={editForm.area} onChange={(e) => setEditForm((prev) => ({ ...prev, area: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Этаж</label>
                  <input type="number" min={0} value={editForm.floor} onChange={(e) => setEditForm((prev) => ({ ...prev, floor: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Сортировка</label>
                  <input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm((prev) => ({ ...prev, sortOrder: e.target.value }))} className="input-field" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Список удобств для сайта</label>
                <textarea value={editForm.amenitiesText} onChange={(e) => setEditForm((prev) => ({ ...prev, amenitiesText: e.target.value }))} rows={8} className="input-field resize-none" placeholder={'Каждое удобство с новой строки\nWi-Fi\nДуш\nМангал\nПарковка'} />
                <p className="mt-2 text-xs text-gray-400">Каждая строка станет отдельным пунктом удобств на сайте.</p>
              </div>
              <div className="rounded-2xl border border-sea-100 bg-sea-50 p-4 text-sm text-gray-600">
                Первое изображение в списке станет главным на карточке номера и на странице бронирования.
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ImageIcon className="h-4 w-4 text-sea-600" /> Галерея номера
              </div>

              <AdminFileDropzone
                title={savingId === 'room-images' ? 'Загрузка...' : 'Перетащите фото номера сюда'}
                hint="Можно загружать сколько угодно изображений. Новые фото добавляются в конец галереи."
                multiple
                disabled={savingId === 'room-images'}
                onFilesSelected={handleRoomImageUpload}
              />

              {(editForm.images || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">Фотографий пока нет</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(editForm.images || []).map((image: string, index: number) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="relative h-44 w-full bg-gray-100">
                        <AppImage src={image} alt={`Фото ${index + 1}`} fill className="object-cover" />
                        <div className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white">
                          {index === 0 ? 'Обложка' : `#${index + 1}`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40" title="Поднять выше">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => moveImage(index, 1)} disabled={index === (editForm.images || []).length - 1} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40" title="Опустить ниже">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                        <button type="button" onClick={() => removeImage(index)} className="rounded-xl p-2 text-red-500 hover:bg-red-50" title="Удалить фото">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={saveRoom} disabled={savingId === 'room-save'} className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {savingId === 'room-save' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
                </button>
                <button onClick={closeRoomModal} className="btn-outline">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
