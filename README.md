# Система автоматизації сервісного центру з ремонту комп'ютерної техніки

Курсовий проєкт з дисципліни «Конструювання програмного забезпечення».

Система забезпечує: авторизацію працівників, облік клієнтів і техніки, створення та супровід заявок на ремонт,
облік виконаних робіт і запчастин (зі складом), **автоматичний розрахунок вартості ремонту**,
пошук заявок та формування звітів.

## Стек технологій

| Шар | Технології |
|---|---|
| Backend | PHP 8.5, Laravel 13, Laravel Sanctum (токени) |
| Frontend | React 19, Vite, React Router, HTML + CSS + JavaScript |
| База даних | MySQL 8 |
| Взаємодія | REST API (JSON) |
| Контроль версій | Git + GitHub |

## Структура

```
backend/    Laravel: REST API
  app/Enums/OrderStatus.php          статуси заявки і дозволені переходи
  app/Models/                        Eloquent-моделі (Order::totals() — розрахунок вартості)
  app/Services/OrderService.php      бізнес-логіка заявки (статуси, склад, закриті заявки)
  app/Http/Controllers/              контролери API
  app/Http/Resources/OrderResource   JSON-представлення заявки
  database/migrations/               схема БД
  database/seeders/                  демо-дані
  routes/api.php                     усі маршрути API
  tests/Feature/                     автотести
frontend/   React SPA
  src/api.js, auth.jsx, hooks.js     запити до API, авторизація, хуки
  src/components/                    FormModal, CrudPanel, Layout
  src/pages/                         сторінки (заявки, клієнти, склад, звіти, співробітники)
```

## Схема бази даних

```mermaid
erDiagram
    users ||--o{ orders : "майстер"
    clients ||--o{ devices : має
    devices ||--o{ orders : "ремонтується"
    orders ||--o{ order_works : містить
    orders ||--o{ order_parts : містить
    services ||--o{ order_works : "з прайсу"
    parts ||--o{ order_parts : "зі складу"

    users { id name email password role is_active }
    clients { id full_name phone email discount }
    devices { id client_id type brand model serial_number }
    orders { id device_id master_id problem status closed_at created_at }
    services { id name price }
    parts { id name price stock }
    order_works { id order_id service_id name price quantity }
    order_parts { id order_id part_id name price quantity }
```

Назва й ціна роботи/запчастини **копіюються** в заявку, тому зміна прайсу не змінює вартість старих заявок.

## Бізнес-правила

- **Вартість** = (роботи + запчастини) − знижка клієнта у %. Рахується автоматично (`Order::totals()`).
- **Статуси**: Нова → Діагностика → В ремонті / Очікує запчастини → Готова до видачі → Видана; з більшості статусів можна скасувати.
  Недозволені переходи API відхиляє (422).
- **Склад**: додавання запчастини в заявку зменшує залишок; видалення зі заявки або скасування заявки — повертає.
  Використати більше, ніж є на складі, не можна.
- **Закриті** (видані/скасовані) заявки змінювати не можна.
- **Ролі**: *Адміністратор* — усе, плюс керування співробітниками, прайсом і складом;
  *Майстер* — клієнти, техніка, заявки, звіти, перегляд прайсу і складу.
- Клієнта чи техніку, на які є посилання (техніка / заявки), видалити не можна.
- Останнього адміністратора вимкнути не можна; вимкнений працівник одразу втрачає доступ.

## REST API (префікс `/api`)

Усе, крім `POST /login`, потребує заголовка `Authorization: Bearer <токен>`.

| Метод | Адреса | Опис |
|---|---|---|
| POST | `/login` | вхід, повертає токен |
| POST | `/logout`, GET `/me` | вихід, поточний користувач |
| GET | `/masters` | активні працівники (для призначення заявки) |
| CRUD | `/clients` | клієнти |
| GET, POST | `/clients/{id}/devices` | техніка клієнта |
| PUT, DELETE | `/devices/{id}` | редагування / видалення техніки |
| GET | `/services`, `/parts` | прайс і склад (читання — всім) |
| POST, PUT, DELETE | `/services`, `/parts` | зміна прайсу і складу (**admin**) |
| GET | `/orders?search=&status=&from=&to=&page=` | пошук і фільтрація заявок |
| POST | `/orders` | створити заявку |
| GET | `/orders/{id}` | заявка з роботами, запчастинами і сумою |
| PATCH | `/orders/{id}/status` | змінити статус |
| POST | `/orders/{id}/works`, `/orders/{id}/parts` | додати роботу / запчастину |
| DELETE | `/order-works/{id}`, `/order-parts/{id}` | видалити роботу / запчастину із заявки |
| GET | `/order-statuses` | список статусів |
| GET | `/reports/summary?from=&to=` | звіт за період |
| GET, POST, PUT | `/users` | працівники (**admin**) |

## Запуск

Потрібні: PHP 8.3+ (з розширеннями `pdo_mysql`, `mbstring`, `openssl`), Composer, Node.js 20+, MySQL 8.

### 1. База даних

```sql
CREATE DATABASE service_center CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env          # у .env вкажіть DB_USERNAME / DB_PASSWORD для MySQL
php artisan key:generate
php artisan migrate --seed    # створює таблиці й демо-дані
php artisan serve             # http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (запити /api проксуються на Laravel)
```

### Демо-акаунти (створює сидер)

| Роль | Email | Пароль |
|---|---|---|
| Адміністратор | admin@service.test | admin123 |
| Майстер | master@service.test | master123 |

Це лише демонстраційні паролі для локальної розробки.

## Тести

```bash
cd backend
php artisan test
```

Тести працюють на SQLite у пам'яті й перевіряють авторизацію, права доступу, розрахунок вартості зі знижкою,
облік складу, переходи статусів, пошук заявок та звіти.

## Git / GitHub

```bash
git add .
git commit -m "Початкова версія системи сервісного центру"
git branch -M main
git remote add origin https://github.com/<ваш-акаунт>/<репозиторій>.git
git push -u origin main
```

Файли `.env`, `vendor/`, `node_modules/` і локальні бази виключені через `.gitignore`.
