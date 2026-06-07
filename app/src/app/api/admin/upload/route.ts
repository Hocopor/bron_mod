import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { extname, join, resolve } from 'path'
import { randomBytes } from 'crypto'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]
const MAX_SIZE = 100 * 1024 * 1024
const UPLOAD_ROOT = join(process.cwd(), 'uploads')
const LEGACY_UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads')

function sanitizeFolder(input: string | null) {
  const parts = (input || '')
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)

  return parts.length > 0 ? parts : ['misc']
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = sanitizeFolder(formData.get('folder')?.toString() || null)

  if (!file) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Тип файла не поддерживается' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (максимум 100MB)' }, { status: 400 })
  }

  const ext = extname(file.name) || (file.type.startsWith('video/') ? '.mp4' : '.jpg')
  const filename = `${Date.now()}-${randomBytes(10).toString('hex')}${ext}`
  const uploadDir = join(UPLOAD_ROOT, ...folder)

  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(join(uploadDir, filename), Buffer.from(bytes))

  return NextResponse.json({ url: `/uploads/${folder.join('/')}/${filename}` })
}

export async function DELETE(req: NextRequest) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url : ''

  if (!url.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'Можно удалять только загруженные файлы' }, { status: 400 })
  }

  const uploadsPath = resolve(UPLOAD_ROOT)
  const legacyUploadsPath = resolve(LEGACY_UPLOAD_ROOT)
  const relativePath = url.replace(/^\/uploads\//, '')
  const filePath = resolve(UPLOAD_ROOT, relativePath)
  const legacyFilePath = resolve(LEGACY_UPLOAD_ROOT, relativePath)

  if (!filePath.startsWith(uploadsPath) || !legacyFilePath.startsWith(legacyUploadsPath)) {
    return NextResponse.json({ error: 'Некорректный путь файла' }, { status: 400 })
  }

  try {
    await unlink(filePath)
  } catch {
    try {
      await unlink(legacyFilePath)
    } catch {
      // Ignore if already removed
    }
  }

  return NextResponse.json({ ok: true })
}
