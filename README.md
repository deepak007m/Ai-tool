# BookMyEvent — PostgreSQL Schema & Migrations

This repository contains the **PostgreSQL schema** for BookMyEvent, managed via **Prisma Migrate**.

## What’s included

- Prisma schema: `prisma/schema.prisma`
- Version-controlled migrations: `prisma/migrations/*`
- Optional local PostgreSQL via Docker Compose: `docker-compose.yml`

## Documentation

- Schema relationships and ER diagram: [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md)

## Quick start (local)

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:migrate
```
