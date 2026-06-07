# Модуль бронирования (bron_mod)

Самостоятельный модуль онлайн-бронирования номеров для VPS (Ubuntu 24), подключается к сайтам на **Tilda** через поддомены. Извлечён из проекта `azov-resort`.

Документация:
- **`PROJECT.md`** — карта проекта (архитектура, модели, решения). Читать первым.
- **`LIVE_PLAN.md`** — текущий план и прогресс.
- **`TZ.md`** — исходное техзадание.
- **`CLAUDE.md`** — правила работы над проектом.

## Стек
Next.js 14 (App Router) · React 18 · TypeScript · Prisma 5 · PostgreSQL 16 · Tailwind · Docker Compose · Caddy.

## Архитектура подключения к Tilda
- Основной сайт остаётся на Tilda (`example.ru`).
- `booking.example.ru` → витрина (карточки/страницы номеров, бронирование).
- `admin.example.ru` → админка.
- Оба поддомена через DNS A-запись ведут на VPS, Caddy проксирует на приложение (порт 3000) и сам выпускает HTTPS-сертификаты.
- На страницах Tilda — кнопки «Забронировать» со ссылками на нужные страницы поддомена.
- Несколько сайтов Tilda (разные домены) → одна админка: у каждого **Объекта** свой публичный URL.

## Запуск на сервере
```bash
cp .env.example .env      # заполнить POSTGRES_*, ADMIN_*, домены
# Сгенерировать хэш пароля админа:
#   node -e "console.log(require('bcryptjs').hashSync('ПАРОЛЬ', 10))"
# Сгенерировать JWT-секрет: openssl rand -base64 48

docker compose build
docker compose up -d
# Схема БД синхронизируется автоматически при старте (prisma db push в entrypoint).
```

Caddy: установить Caddy на VPS, положить `caddy/Caddyfile` в `/etc/caddy/Caddyfile`, заменить домены и email. SSL выпускается автоматически (Let's Encrypt):
```bash
sudo cp caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Локальная разработка
⚠️ Как и у донора, проект рассчитан на сборку в Docker. Для локального запуска нужны Node 22 + локальный PostgreSQL и `DATABASE_URL`.
```bash
cd app
npm install
npx prisma generate
npx prisma db push
npm run dev
```
