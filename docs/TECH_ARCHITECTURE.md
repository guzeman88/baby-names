# Technical Architecture Document
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Engineering Lead

---

## 1. Architecture Overview

BabyName is built as a monorepo containing a shared React Native (Expo) application that targets iOS, Android, and Web from a single codebase, backed by a Node.js API server with a PostgreSQL database.

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │   iOS    │  │ Android  │  │   Web (Browser)      │  │
│  │  (Expo)  │  │  (Expo)  │  │ (Expo + React DOM)   │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
└───────┼─────────────┼──────────────────-┼──────────────┘
        │             │                   │
        └─────────────┼───────────────────┘
                      │ HTTPS / REST
┌─────────────────────▼───────────────────────────────────┐
│                    API LAYER                            │
│              Node.js (Express / Fastify)                │
│         ┌──────────────────────────────────┐            │
│         │        Auth Middleware           │            │
│         │        Route Handlers            │            │
│         │        Business Logic            │            │
│         └────────────┬─────────────────────┘            │
└──────────────────────┼──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼───────┐           ┌─────────▼──────┐
│  PostgreSQL   │           │     Redis      │
│  (Primary DB) │           │   (Cache)      │
└───────────────┘           └────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | **Expo SDK** (React Native) | Single codebase for iOS, Android, and Web. Large ecosystem, OTA updates via EAS. |
| Navigation | **Expo Router** (file-based) | Native stack navigation on mobile, client-side routing on web. Mirrors Next.js DX. |
| State Management | **Zustand** | Lightweight, minimal boilerplate, excellent React Native support. |
| Server State / Caching | **TanStack Query (React Query)** | Handles loading/error states, cache invalidation, background refetching. |
| Gesture Handling | **React Native Gesture Handler** | Required for smooth, native-feel swipe cards. Works across platforms. |
| Animation | **React Native Reanimated v3** | Worklet-based animations run on the UI thread — critical for 60fps swipe cards. |
| Charts | **Victory Native XL** | Supports both native and web rendering. Used for trend line charts. |
| UI Component Base | **Custom component library** (styled with StyleSheet + design tokens) | Full design control; avoids 3rd-party UI library lock-in. |
| Form Handling | **React Hook Form** | Minimal re-renders, schema validation integration. |
| Validation | **Zod** | Shared schema definitions usable on both client and server. |
| Async Storage | **Expo SecureStore** (sensitive) + **MMKV** (general) | SecureStore for tokens; MMKV for fast local key-value (swipe history cache). |

### 2.2 Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Stable, widely supported, excellent async I/O for DB-heavy workloads. |
| Framework | **Fastify** | Faster than Express, built-in schema validation via JSON Schema, TypeScript native. |
| ORM | **Prisma** | Type-safe database access, migration management, readable schema DSL. |
| Authentication | **JWT (RS256)** + **bcrypt** | Stateless auth; RS256 for key rotation capability without token invalidation. |
| Email | **Resend** | Developer-friendly email API for transactional emails (verification, password reset). |
| Validation | **Zod** (shared with frontend) | Consistent validation at API boundaries. |
| Testing | **Vitest** + **Supertest** | Fast unit tests; Supertest for integration testing API routes. |

### 2.3 Database

| Component | Technology | Rationale |
|---|---|---|
| Primary Database | **PostgreSQL 16** | Relational model suits name data + user data relationships. Full-text search built in. |
| Cache | **Redis 7** | LRU cache for computed popularity percentiles and distribution data (expensive to recompute per request). |
| Connection Pooling | **PgBouncer** | Manages connection pool between API server and PostgreSQL in production. |
| Migrations | **Prisma Migrate** | Version-controlled, repeatable, team-friendly. |

### 2.4 Infrastructure & DevOps

| Component | Technology |
|---|---|
| Mobile Builds | **Expo EAS Build** |
| OTA Updates | **Expo EAS Update** |
| Web Hosting | **Vercel** (or equivalent edge-capable host) |
| API Hosting | **Railway** or **Fly.io** (containerized Node.js) |
| Database Hosting | **Supabase** (managed PostgreSQL + connection pooling) or **Neon** |
| Redis Hosting | **Upstash** (serverless Redis, generous free tier) |
| CI/CD | **GitHub Actions** |
| Secret Management | **GitHub Actions Secrets** + **Doppler** (for runtime env) |
| Error Monitoring | **Sentry** (React Native SDK + Node SDK) |
| Analytics | **PostHog** (self-hosted or cloud) |

---

## 3. Monorepo Structure

```
babyname/
├── apps/
│   ├── mobile/                   # Expo (iOS / Android / Web) app
│   │   ├── app/                  # Expo Router file-based routes
│   │   │   ├── (tabs)/
│   │   │   │   ├── browse/
│   │   │   │   │   ├── index.tsx         # Browse screen
│   │   │   │   │   └── [name].tsx        # Name detail screen
│   │   │   │   ├── swipe/
│   │   │   │   │   └── index.tsx         # Swipe screen
│   │   │   │   └── lists/
│   │   │   │       ├── index.tsx         # Lists overview
│   │   │   │       └── [listId].tsx      # Individual list view
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── settings.tsx
│   │   │   └── _layout.tsx
│   │   ├── components/           # Shared UI components
│   │   ├── hooks/                # Custom hooks
│   │   ├── store/                # Zustand stores
│   │   └── assets/
│   │
│   └── api/                      # Node.js / Fastify API server
│       ├── src/
│       │   ├── routes/           # Route handlers
│       │   ├── services/         # Business logic
│       │   ├── middleware/       # Auth, error handling, rate limiting
│       │   ├── lib/              # DB client, Redis client, email
│       │   └── index.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── tests/
│
├── packages/
│   ├── shared-types/             # Shared TypeScript types & Zod schemas
│   ├── data-pipeline/            # SSA data download & ingestion scripts
│   └── eslint-config/            # Shared ESLint config
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-api.yml
│       └── eas-build.yml
│
├── package.json                  # Root workspace config (npm workspaces)
├── turbo.json                    # Turborepo config for build caching
└── tsconfig.base.json
```

---

## 4. Data Flow

### 4.1 Browse Screen Data Flow

```
User opens Browse
       │
       ▼
TanStack Query checks cache
       │
       ├── Cache HIT ──────────────────────────────────────►  Render names list
       │                                                              │
       └── Cache MISS                                         User adjusts filters
              │                                                       │
              ▼                                              Filter applied client-side
     GET /api/names?gender=&page=&limit=                    (no new network call needed
     (paginated, initial load)                               for filter changes — all
              │                                              names for gender loaded
              ▼                                              and filtered in memory)
     API queries PostgreSQL
     (names table, with index
      on gender + popularity_rank)
              │
              ▼
     Response cached in TanStack
     Query for 30 minutes
              │
              ▼
     Render names list
```

**Key design decision:** All names for the selected gender are loaded into the client in a single paginated set (or in chunks via infinite scroll). Filter operations (popularity slider) are applied **client-side** using the in-memory dataset. This avoids a network round-trip on every filter adjustment, which is critical for the real-time slider and distribution curve interaction.

The names dataset per gender is on the order of ~50,000 rows but each row is small (name string + precomputed metrics). Estimated payload: ~3–5MB per gender uncompressed, ~800KB–1.5MB gzip. This is an acceptable one-time load, cached aggressively.

### 4.2 Swipe Screen Data Flow

```
User opens Swipe
       │
       ▼
Client loads full name list for selected gender
(same payload as Browse — served from TanStack Query cache if already loaded)
       │
       ▼
Client fetches user's swipe history (liked + passed name IDs)
GET /api/swipes/history
       │
       ▼
Client builds shuffled deck = all names − already swiped names
(shuffle is deterministic from a session seed stored locally)
       │
       ▼
User swipes:
  POST /api/swipes { nameId, decision: "liked"|"passed" }
       │
       ▼
API writes to swipe_history table
Updates user's liked_list or passed_list accordingly
       │
       ▼
Client updates local state (removes card from deck, advances to next)
```

**Offline resilience:** Swipe decisions are queued locally (MMKV) and synced to the API when connectivity is restored. Guest users: all decisions stored locally only.

### 4.3 Name Detail Data Flow

```
User taps name card or list item
       │
       ▼
Client checks TanStack Query cache for name detail
       │
       ├── Cache HIT ──► Render detail view (near-instant)
       │
       └── Cache MISS
              │
              ▼
     GET /api/names/:nameId/detail
     (includes yearly trend data)
              │
              ▼
     API queries name_yearly_stats table
     Returns array of { year, births, rank } for all years
              │
              ▼
     Response cached in TanStack Query (24hr TTL — data is static)
              │
              ▼
     Render trend chart + stats panel
```

---

## 5. Authentication Architecture

- **Registration:** Email + bcrypt-hashed password stored in `users` table. Verification email sent via Resend.
- **Login:** Server validates credentials, issues a short-lived **access token** (JWT, 15 min) and a long-lived **refresh token** (JWT, 30 days, stored in HTTP-only cookie on web; in SecureStore on native).
- **Token refresh:** Client uses a Fastify plugin / React Query interceptor to silently refresh the access token before it expires.
- **Authorization:** All protected API endpoints validate the access token via middleware. User ID is extracted from the token — no additional DB lookup required for auth.
- **Guest-to-account migration:** On registration, the client sends locally stored swipe history as part of the registration payload. The server inserts this history before returning the first token.

---

## 6. Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|---|---|---|---|
| Full name list (per gender) | TanStack Query (client) | 30 min | Manual on data pipeline run |
| Name detail + yearly stats | TanStack Query (client) | 24 hrs | Never (data is static) |
| Popularity distribution metadata | Redis (server) | 24 hrs | Cleared on data pipeline run |
| User swipe history | TanStack Query (client) | 5 min | Invalidated on each swipe POST |
| User lists | TanStack Query (client) | 2 min | Invalidated on list mutations |

---

## 7. Security Considerations

| Concern | Mitigation |
|---|---|
| SQL Injection | Prisma ORM with parameterized queries — no raw SQL unless explicitly parameterized |
| XSS | React Native immune to DOM XSS; Web: React escapes all JSX output by default |
| CSRF | JWT in Authorization header (not cookies on native); SameSite=Strict cookie on web |
| Brute Force / Credential Stuffing | Rate limiting on `/auth/login` (10 req/min per IP via Fastify rate-limit plugin) |
| Insecure Token Storage | Native: Expo SecureStore (Keychain/Keystore); Web: HTTP-only cookie for refresh token |
| Mass Assignment | All request bodies validated via Zod before processing |
| Enumeration | Login errors return identical message for wrong email and wrong password |
| Dependency Vulnerabilities | Dependabot alerts enabled; `npm audit` in CI |

---

## 8. Scalability Considerations

- The names dataset is **read-heavy and static** after ingestion. PostgreSQL with proper indexes and Redis caching handles this with minimal infrastructure.
- User-generated data (swipes, lists) is write-heavy per user but low global throughput for a consumer app. Standard PostgreSQL handles this well up to millions of users.
- The compute-intensive distribution curve calculation (histogram binning across ~50k names) is done **entirely client-side** in JavaScript — no server involvement after the initial name list load. This scales infinitely with zero server cost.
- Stateless API servers allow horizontal scaling behind a load balancer if needed.

---

## 9. Development Environment Setup

```bash
# Prerequisites: Node.js 20+, Docker (for local PostgreSQL + Redis)

# Clone and install
git clone https://github.com/org/babyname.git
cd babyname
npm install

# Start local infrastructure
docker compose up -d   # starts PostgreSQL + Redis

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# Run database migrations
cd apps/api && npx prisma migrate dev

# Run SSA data pipeline (first-time setup — downloads ~30MB)
npm run pipeline:ingest --workspace=packages/data-pipeline

# Start all services
npm run dev   # runs Expo + API concurrently via turbo
```

---

## 10. CI/CD Pipeline

```
Push to feature branch
       │
       ▼
GitHub Actions: ci.yml
  - Lint (ESLint)
  - Type check (tsc --noEmit)
  - Unit tests (Vitest)
  - Integration tests (API against test DB)
       │
       ▼
PR merged to main
       │
       ├──► deploy-api.yml: Build Docker image, deploy to Railway/Fly.io
       └──► eas-build.yml: Trigger EAS Update (OTA) for Expo Go preview
                │
                ▼
         Versioned release
         ├──► EAS Build (iOS .ipa, Android .apk/.aab)
         ├──► App Store / Play Store submission
         └──► Vercel deploy for Web
```
