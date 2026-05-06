# Baby Names App

A cross-platform baby name app (iOS / Android / Web) powered by 100 years of US Social Security Administration data.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces + Turborepo |
| Backend API | Node.js + Fastify v5 + Prisma + PostgreSQL + Redis |
| Mobile | Expo SDK 52 + Expo Router + React Native |
| State | Zustand + TanStack Query |
| Auth | JWT + bcrypt + HttpOnly cookies |

## Quick Start

### Prerequisites
- Node.js v20+
- Docker Desktop (for Redis; PostgreSQL can be native or Docker)
- Expo Go app on your phone (for mobile testing)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Services

**Option A — Docker (recommended)**
```bash
# Start Redis (and Postgres on port 5433 if you don't have native Postgres)
docker compose up -d
```

**Option B — Native Postgres**
If you already have PostgreSQL running on port 5432, create the database:
```sql
CREATE USER babyname WITH PASSWORD 'babyname' CREATEDB;
CREATE DATABASE babyname OWNER babyname;
GRANT ALL ON SCHEMA public TO babyname;
```

### 3. Set Up the API Database

```bash
cd apps/api

# Run migrations
npx prisma migrate dev

# Seed with sample data
npx tsx prisma/seed.ts
```

### 4. Load Real Name Data (Optional but Recommended)

```bash
cd packages/data-pipeline

# Download and load all SSA data (~100k names, takes 2-5 min)
npm run start

# Or do a dry run to verify without DB writes
npm run dry-run
```

### 5. Start Development Servers

```bash
# From repo root — starts API + mobile simultaneously
npm run dev
```

Or separately:
```bash
# API server (port 3001)
cd apps/api && npm run dev

# Mobile app (Expo)
cd apps/mobile && npx expo start
```

### 6. Run Tests

```bash
# API tests only
cd apps/api && npm test

# All workspace tests
npm test
```

## Project Structure

```
Names_1/
├── apps/
│   ├── api/              # Fastify REST API
│   │   ├── prisma/       # Schema + migrations + seed
│   │   └── src/
│   │       ├── lib/      # db, redis, jwt, email utilities
│   │       ├── middleware/
│   │       └── routes/   # auth, names, swipes, lists, users
│   └── mobile/           # Expo React Native app
│       ├── app/          # Expo Router file-based routes
│       │   ├── (tabs)/   # Main tab screens
│       │   ├── auth/     # Auth screens
│       │   ├── name/     # Name detail
│       │   └── lists/    # List detail
│       ├── lib/          # API client
│       └── stores/       # Zustand stores
└── packages/
    └── data-pipeline/    # SSA data download + ingestion
```

## Test Account

After seeding, you can log in with:
- Email: `test@babynames.dev`
- Password: `TestPass1`

## API Endpoints

Base URL: `http://localhost:3001/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | — | Health check |
| POST | /auth/register | — | Create account |
| POST | /auth/login | — | Sign in |
| POST | /auth/refresh | — | Refresh access token |
| POST | /auth/logout | ✓ | Sign out |
| GET | /names | — | Browse names (paginated) |
| GET | /names/distribution | — | Popularity distribution |
| GET | /names/:id | — | Name detail + trend data |
| GET | /swipes/history | ✓ | Get swipe history |
| POST | /swipes | ✓ | Record a swipe |
| GET | /lists | ✓ | Get all lists |
| POST | /lists | ✓ | Create a list |
| GET | /lists/:id | ✓ | List detail with entries |
| GET | /users/me | ✓ | Get profile |
| PATCH | /users/me | ✓ | Update profile |
