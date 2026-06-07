# DEPLOY.md — деплой модуля бронирования на голую Ubuntu 24

Инструкция «с нуля»: чистый сервер Ubuntu 24.04 → рабочий модуль на двух поддоменах.
Стек на сервере: **Docker** (Postgres + Next.js-приложение) + **Caddy** на хосте (реверс-прокси + авто-HTTPS).

Везде, где написано заглавными — **подставьте своё**:
- `ВАШ-ДОМЕН.ru` — ваш домен (например `azov-resort.ru`)
- `ВАШ_IP` — публичный IP сервера
- `СИЛЬНЫЙ_ПАРОЛЬ_БД` — придумайте пароль для базы
- `ПАРОЛЬ_АДМИНА` — придумайте пароль для входа в админку

Итоговые адреса:
- `https://admin.ВАШ-ДОМЕН.ru` — админка (один общий домен)
- домен(ы) **объектов** — задаются в админке (поле «Домен»), напр. `nomera.клиент.ru`. По такому домену гость сразу видит список номеров объекта. Сертификат выпускается автоматически (On-Demand TLS).

---

## Шаг 0. DNS (сделать заранее, до выпуска SSL)

В панели управления доменом создайте **A-запись** админки на IP сервера:

| Тип | Имя       | Значение |
|-----|-----------|----------|
| A   | `admin`   | `ВАШ_IP` |

Для каждого **объекта** позже добавляется своя A-запись поддомена (его можно держать на другом домене/в другой DNS-панели — главное направить на `ВАШ_IP`). Например `nomera` → `ВАШ_IP`. Этот поддомен вписывается в админке в поле «Домен» объекта — больше ничего настраивать на сервере не нужно.

Проверка (с любого компьютера):
```bash
nslookup admin.ВАШ-ДОМЕН.ru
```
Должна вернуть `ВАШ_IP`. DNS может обновляться до нескольких часов — Caddy не выпустит сертификат, пока домен не указывает на сервер.

---

## Шаг 1. Подключиться к серверу и обновить систему

```bash
ssh root@ВАШ_IP
```

```bash
apt update && apt upgrade -y
```

---

## Шаг 2. Файрвол (открыть 22, 80, 443)

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

---

## Шаг 3. (Опционально, но желательно) swap 2 ГБ

Сборка Next.js прожорлива по памяти — на сервере с 1–2 ГБ RAM без swap билд может упасть.
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

---

## Шаг 4. Установить Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
systemctl status docker --no-pager
```

Убедитесь, что в выводе `status` написано `Active: active (running)`. Затем проверьте версии:
```bash
docker --version
docker compose version
```

---

## Шаг 5. Установить Caddy (на хост)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
caddy version
```

---

## Шаг 6. Склонировать проект с GitHub

```bash
apt install -y git
cd /opt
git clone https://github.com/Hocopor/bron_mod.git
cd bron_mod
```

> Если репозиторий **приватный** — клонирование попросит логин/пароль. Вместо пароля
> используйте **Personal Access Token** GitHub (Settings → Developer settings → Tokens),
> либо сделайте репозиторий публичным на время деплоя.

---

## Шаг 7. Сгенерировать секреты

**7.1 bcrypt-хэш пароля админа** (в .env кладётся именно ХЭШ, не сам пароль).
Заодно не требует Node на хосте — считаем во временном контейнере:
```bash
docker run --rm node:22-bookworm-slim sh -lc \
  "cd /tmp && npm init -y >/dev/null 2>&1 && npm i bcryptjs >/dev/null 2>&1 && node -e \"console.log(require('bcryptjs').hashSync('ПАРОЛЬ_АДМИНА',10))\""
```
Скопируйте полученную строку вида `$2a$10$....` — это `ADMIN_PASSWORD_HASH`.

**7.2 Секрет для JWT-сессии:**
```bash
openssl rand -base64 48
```
Скопируйте строку — это `ADMIN_JWT_SECRET`.

---

## Шаг 8. Создать файл `.env`

Создайте `/opt/bron_mod/.env` (например через `nano .env`) и вставьте, подставив свои значения:

```ini
# ==== База данных ====
POSTGRES_USER=bron
POSTGRES_PASSWORD=СИЛЬНЫЙ_ПАРОЛЬ_БД
POSTGRES_DB=bron_mod
DATABASE_URL=postgresql://bron:СИЛЬНЫЙ_ПАРОЛЬ_БД@postgres:5432/bron_mod?schema=public

# ==== Главный админ (посевается в БД при первом логине) ====
ADMIN_LOGIN=admin
ADMIN_PASSWORD_HASH=ВСТАВЬТЕ_ХЭШ_ИЗ_ШАГА_7.1
ADMIN_JWT_SECRET=ВСТАВЬТЕ_СЕКРЕТ_ИЗ_ШАГА_7.2

# ==== Домены ====
# Домен админки (на нём доступны только /admin и /api/admin).
ADMIN_DOMAIN=admin.ВАШ-ДОМЕН.ru
# Базовый URL для метаданных/canonical. Домены объектов задаются в админке, не здесь.
NEXT_PUBLIC_SITE_URL=https://admin.ВАШ-ДОМЕН.ru

# ==== Сборка ====
SKIP_DB_DURING_BUILD=1
NODE_ENV=production
```

Сохраните (в nano: `Ctrl+O`, `Enter`, `Ctrl+X`).

> `.env` в `.gitignore` — он остаётся только на сервере и не попадает в git.

---

## Шаг 9. Собрать и запустить приложение

```bash
cd /opt/bron_mod
docker compose build --no-cache
docker compose up -d
```

Схема БД создаётся автоматически при старте контейнера (`prisma db push` в entrypoint).

Проверка статуса и логов:
```bash
docker compose ps
docker compose logs -f app
```
Дождитесь в логах строки `Starting Next.js...` и что контейнер `healthy`. Проверка изнутри:
```bash
curl -I http://127.0.0.1:3015
```
Должен ответить `HTTP/1.1 200` или `307` (редирект) — приложение живо.

---

## Шаг 10. Настроить Caddy (домены + SSL)

Откройте ваш основной `/etc/caddy/Caddyfile` и добавьте в него блоки из `caddy/Caddyfile` репозитория:

```bash
cat /opt/bron_mod/caddy/Caddyfile
```

Скопируйте содержимое и вставьте в `/etc/caddy/Caddyfile`:
```bash
nano /etc/caddy/Caddyfile
```
Важно:
- **Глобальный блок** `{ on_demand_tls { ask ... } }` должен быть в самом верху файла и только один раз. Если у вас уже есть глобальный блок — допишите `on_demand_tls` внутрь него.
- `admin.example.ru` → `admin.ВАШ-ДОМЕН.ru`.
- Блок `https:// { tls { on_demand } ... }` ловит все домены объектов — его править не нужно.

Проверьте и перезагрузите:
```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy --no-pager
```
Сертификат для домена админки выпустится сразу (нужен рабочий DNS из шага 0). Сертификаты для доменов объектов Caddy выпускает **автоматически при первом заходе** — но только для доменов, привязанных к объекту в админке (проверяется через `/api/tls-check`). Поэтому сначала создайте объект и впишите его домен, затем направьте DNS — и домен заработает сам.

---

## Шаг 11. Проверка

1. Откройте `https://admin.ВАШ-ДОМЕН.ru/admin/login` → войдите логином `admin` и `ПАРОЛЬ_АДМИНА`.
   При первом входе главный админ автоматически создаётся в БД из env.
2. В админке: **Номера** → «Создать объект» (укажите название и **домен** объекта) → внутри объекта «Номер» (заполните цену, фото, удобства).
3. Направьте DNS домена объекта на `ВАШ_IP` и откройте `https://<домен-объекта>` → сразу видно список номеров → оформите тестовую бронь.
4. Вернитесь в **Бронирования** — бронь появится в шахматке; отметьте статус/оплату.
5. В **Настройки** → пропишите контакты, реквизиты, ссылки на документы, депозит, время заезда/выезда и ссылки кнопок «Назад»/«На главную».

---

## Подключение к Tilda

1. В админке у каждого Объекта заполните поле **«Домен»** (например `nomera.клиент.ru`) и направьте этот поддомен (A-запись DNS) на `ВАШ_IP`.
2. На сайте Tilda повесьте кнопку (например «Номера») со ссылкой на этот домен — по ней сразу откроется список номеров объекта.
3. Кнопки «Назад»/«На главную» на страницах бронирования ведут обратно на Tilda — их адреса задаются в **Настройках**.
4. Несколько сайтов Tilda → разные Объекты с разными доменами, одна общая админка.

---

## Обновление версии (после новых пушей в GitHub)

```bash
cd /opt/bron_mod
git pull
docker compose build
docker compose up -d
docker compose logs -f app
```
Данные (БД и загруженные фото) сохраняются в docker-томах и при пересборке не теряются.

---

## Полезные команды

```bash
docker compose ps                 # статус контейнеров
docker compose logs -f app        # логи приложения
docker compose logs -f postgres   # логи базы
docker compose restart app        # перезапустить приложение
docker compose down               # остановить всё (данные в томах сохранятся)
systemctl reload caddy            # перечитать конфиг Caddy
journalctl -u caddy -f            # логи Caddy (выпуск сертификатов и т.п.)
```

Резервная копия базы:
```bash
docker compose exec postgres pg_dump -U bron bron_mod > /opt/backup_$(date +%F).sql
```

---

## Если что-то не работает

- **Caddy не выпускает сертификат для домена объекта** → проверьте, что (1) домен вписан в объект в админке и объект активен, (2) DNS домена уже указывает на `ВАШ_IP` (`nslookup <домен>`), (3) порты 80/443 открыты (шаг 2). Можно проверить вручную: `curl "http://127.0.0.1:3015/api/tls-check?domain=<домен>"` — должно вернуть `ok`. Логи: `journalctl -u caddy -f`.
- **502 Bad Gateway** → приложение не поднялось. Смотрите `docker compose logs -f app` и `curl -I http://127.0.0.1:3015`.
- **Админка пускает на витрину / наоборот** → проверьте `ADMIN_DOMAIN` в `.env` (должен совпадать с `admin.ВАШ-ДОМЕН.ru`), после правки `.env` — `docker compose up -d`.
- **Не входит главный админ** → проверьте `ADMIN_LOGIN` и что `ADMIN_PASSWORD_HASH` — это именно bcrypt-хэш от вашего пароля (шаг 7.1), а не сам пароль.
```
