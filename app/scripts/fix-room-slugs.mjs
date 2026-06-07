// Одноразовая идемпотентная миграция: чинит slug номеров, содержащие
// не-ASCII символы (например, кириллицу из старой логики генерации).
// Кириллица в URL percent-кодируется и ломала открытие карточки номера (404).
// Запускается из docker-entrypoint.sh после `prisma db push`.
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASCII_SLUG = /^[a-z0-9-]+$/

async function uniqueSlug() {
  for (let i = 0; i < 10; i += 1) {
    const slug = `room-${randomBytes(5).toString('hex')}`
    const exists = await prisma.room.findUnique({ where: { slug } })
    if (!exists) return slug
  }
  return `room-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
}

async function main() {
  const rooms = await prisma.room.findMany({ select: { id: true, slug: true } })
  let fixed = 0
  for (const room of rooms) {
    if (ASCII_SLUG.test(room.slug)) continue
    const slug = await uniqueSlug()
    await prisma.room.update({ where: { id: room.id }, data: { slug } })
    console.log(`[fix-room-slugs] ${room.slug} -> ${slug}`)
    fixed += 1
  }
  console.log(`[fix-room-slugs] готово, исправлено: ${fixed}`)
}

main()
  .catch((err) => {
    // Не валим запуск приложения, если миграция slug не прошла.
    console.error('[fix-room-slugs] ошибка (пропускаю):', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
