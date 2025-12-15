# BookMyEvent PostgreSQL Schema

This repository uses **Prisma Migrate** to manage the PostgreSQL schema.

## Entities & Relationships

- **users**
  - One **user (vendor)** can create many **services**.
  - One **user (customer)** can create many **negotiations**.
  - One **user (customer)** can create many **reviews**.

- **categories**
  - One **category** can contain many **services**.

- **services**
  - Belongs to one **vendor (users.id)**.
  - Belongs to one **category (categories.id)**.
  - Has many **negotiations**.
  - Has many **reviews**.

- **negotiations**
  - Belongs to one **service (services.id)**.
  - Belongs to one **customer (users.id)**.

- **reviews**
  - Belongs to one **service (services.id)**.
  - Belongs to one **customer (users.id)**.

## Cascading Deletes

All foreign keys use `ON DELETE CASCADE`:

- Deleting a **user** deletes their **services**, **negotiations**, and **reviews**.
- Deleting a **category** deletes its **services** (and therefore their negotiations/reviews).
- Deleting a **service** deletes its **negotiations** and **reviews**.

## Indexes

Indexes are created for query performance on:

- `services.vendor_id`
- `services.category_id`
- `services.city`
- `negotiations.customer_id`
- `reviews.customer_id`
- `users.city`

## ER Diagram (Mermaid)

```mermaid
erDiagram
  users ||--o{ services : "vendor_id"
  categories ||--o{ services : "category_id"

  services ||--o{ negotiations : "service_id"
  users ||--o{ negotiations : "customer_id"

  services ||--o{ reviews : "service_id"
  users ||--o{ reviews : "customer_id"
```

## Running Migrations Locally

### Option A: Using Docker Compose (recommended)

1. Start PostgreSQL:
   
   ```bash
   docker compose up -d
   ```

2. Create `.env` from the example and set `DATABASE_URL`:

   ```bash
   cp .env.example .env
   # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookmyevent?schema=public"
   ```

3. Install dependencies and apply migrations:

   ```bash
   npm install
   npm run db:migrate
   npm run db:generate
   ```

### Option B: Existing PostgreSQL

Point `DATABASE_URL` at your PostgreSQL instance and run `npm run db:migrate`.
