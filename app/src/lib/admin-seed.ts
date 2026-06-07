import { prisma } from '@/lib/db'

// Первичный «посев» главного админа в БД из env (ADMIN_LOGIN / ADMIN_PASSWORD_HASH).
// Вызывается при логине. Если в БД ещё нет ни одного ADMIN — создаём его из env,
// после чего логин/пароль главного админа можно менять прямо из админки.
let seeded = false

export async function ensureSeedAdmin(): Promise<void> {
  if (seeded) return

  const login = process.env.ADMIN_LOGIN
  const passwordHash = process.env.ADMIN_PASSWORD_HASH
  if (!login || !passwordHash) return

  try {
    const existingAdmin = await prisma.adminUser.findFirst({ where: { role: 'ADMIN' } })
    if (!existingAdmin) {
      await prisma.adminUser.upsert({
        where: { login },
        update: { role: 'ADMIN', isActive: true },
        create: { login, passwordHash, role: 'ADMIN', isActive: true },
      })
    }
    seeded = true
  } catch {
    // БД ещё не готова — повторим при следующем вызове.
  }
}
