# Data Architecture & Database Schema
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Engineering Lead / Data Engineer

---

## 1. Overview

The data layer has two distinct domains:

1. **Name Data (Static)** — Ingested from the SSA dataset. Read-only after ingestion. Represents ~100,000 name/gender combinations with year-by-year birth counts spanning 1880 to present.
2. **User Data (Dynamic)** — User accounts, preferences, swipe history, and saved lists.

Both domains live in the same PostgreSQL database, separated into logical schema groups.

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAME DATA (Static)                          │
│                                                                     │
│  ┌─────────────┐       ┌──────────────────────┐                     │
│  │    names    │1     *│   name_yearly_stats  │                     │
│  │─────────────│───────│──────────────────────│                     │
│  │ id (PK)     │       │ id (PK)              │                     │
│  │ name        │       │ name_id (FK → names) │                     │
│  │ gender      │       │ year                 │                     │
│  │ popularity_ │       │ births               │                     │
│  │   rank      │       │ rank_that_year       │                     │
│  │ popularity_ │       └──────────────────────┘                     │
│  │   percentile│                                                     │
│  │ total_      │                                                     │
│  │   births    │                                                     │
│  │ peak_rank   │                                                     │
│  │ peak_year   │                                                     │
│  │ first_year  │                                                     │
│  │ last_year   │                                                     │
│  └─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         USER DATA (Dynamic)                         │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐     │
│  │    users    │1  *│    lists    │1  *│    list_entries     │     │
│  │─────────────│────│─────────────│────│─────────────────────│     │
│  │ id (PK)     │    │ id (PK)     │    │ id (PK)             │     │
│  │ email       │    │ user_id(FK) │    │ list_id (FK→lists)  │     │
│  │ password_   │    │ name        │    │ name_id (FK→names)  │     │
│  │   hash      │    │ type (enum) │    │ position            │     │
│  │ email_      │    │ created_at  │    │ added_at            │     │
│  │   verified  │    │ updated_at  │    └─────────────────────┘     │
│  │ last_name   │    └─────────────┘                                │
│  │ gender_pref │                                                     │
│  │ created_at  │    ┌──────────────────────┐                        │
│  │ updated_at  │1  *│    swipe_history     │                        │
│  │             │────│──────────────────────│                        │
│  └─────────────┘    │ id (PK)              │                        │
│                     │ user_id (FK→users)   │                        │
│  ┌──────────────┐   │ name_id (FK→names)   │                        │
│  │ refresh_     │   │ decision (enum)      │                        │
│  │   tokens     │   │ swiped_at            │                        │
│  │──────────────│   └──────────────────────┘                        │
│  │ id (PK)      │                                                    │
│  │ user_id (FK) │   ┌──────────────────────┐                        │
│  │ token_hash   │   │ email_verifications  │                        │
│  │ expires_at   │   │──────────────────────│                        │
│  │ revoked      │   │ id (PK)              │                        │
│  │ created_at   │   │ user_id (FK)         │                        │
│  └──────────────┘   │ token_hash           │                        │
│                     │ expires_at           │                        │
│                     │ used_at              │                        │
│                     └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Table Definitions (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum Gender {
  M
  F
}

enum ListType {
  LIKED    // System list: swipe right decisions
  PASSED   // System list: swipe left decisions
  CUSTOM   // User-created lists
}

enum SwipeDecision {
  LIKED
  PASSED
}

enum GenderPreference {
  BOY
  GIRL
  BOTH
}

// ─── NAME DATA (Static) ───────────────────────────────────────────────────────

model Name {
  id                  Int      @id @default(autoincrement())
  name                String   @db.VarChar(64)
  gender              Gender
  // Computed during data pipeline — reference window: last 10 years
  popularityRank      Int      // 1 = most popular; higher = less popular
  popularityPercentile Float   // 0.0–100.0; 100.0 = most popular
  totalBirths         Int      // Sum of all births across all years
  peakRank            Int      // Best (lowest number) rank ever achieved
  peakYear            Int      // Year when peak rank was achieved
  firstYear           Int      // First year this name appeared in SSA data
  lastYear            Int      // Most recent year this name appeared
  // Reference window births (last N years) — used for ranking
  recentBirths        Int      // Total births in reference window

  yearlyStats         NameYearlyStat[]
  listEntries         ListEntry[]
  swipeHistory        SwipeHistory[]

  @@unique([name, gender])
  @@index([gender, popularityRank])
  @@index([gender, popularityPercentile])
  @@index([name])
}

model NameYearlyStat {
  id          Int    @id @default(autoincrement())
  nameId      Int
  year        Int
  births      Int
  rankThatYear Int?  // Rank among all names of same gender for that year (nullable if not computed)

  name        Name   @relation(fields: [nameId], references: [id], onDelete: Cascade)

  @@unique([nameId, year])
  @@index([nameId])
  @@index([year])
}

// ─── USER DATA (Dynamic) ──────────────────────────────────────────────────────

model User {
  id              String   @id @default(cuid())
  email           String   @unique @db.VarChar(254)
  passwordHash    String   @db.VarChar(72)  // bcrypt output max length
  emailVerified   Boolean  @default(false)
  lastName        String?  @db.VarChar(64)
  genderPref      GenderPreference @default(BOTH)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  lists            List[]
  swipeHistory     SwipeHistory[]
  refreshTokens    RefreshToken[]
  emailVerifications EmailVerification[]

  @@index([email])
}

model RefreshToken {
  id          String   @id @default(cuid())
  userId      String
  tokenHash   String   @unique @db.VarChar(64)  // SHA-256 of the actual token
  expiresAt   DateTime
  revoked     Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
}

model EmailVerification {
  id          String    @id @default(cuid())
  userId      String
  tokenHash   String    @unique @db.VarChar(64)
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model List {
  id          String    @id @default(cuid())
  userId      String
  name        String    @db.VarChar(128)
  type        ListType  @default(CUSTOM)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries     ListEntry[]

  @@index([userId])
  @@index([userId, type])
}

model ListEntry {
  id          String   @id @default(cuid())
  listId      String
  nameId      Int
  position    Int      // For user-controlled ordering within a list
  addedAt     DateTime @default(now())

  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  name        Name     @relation(fields: [nameId], references: [id])

  @@unique([listId, nameId])
  @@index([listId, position])
}

model SwipeHistory {
  id          String        @id @default(cuid())
  userId      String
  nameId      Int
  decision    SwipeDecision
  swipedAt    DateTime      @default(now())

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        Name          @relation(fields: [nameId], references: [id])

  @@unique([userId, nameId])  // One decision per name per user (last decision wins)
  @@index([userId])
  @@index([userId, decision])
}
```

---

## 4. Key Design Decisions

### 4.1 Popularity Percentile as a Stored Column
Rather than computing percentile at query time, `popularityPercentile` is pre-computed and stored in the `names` table during the data pipeline run. This makes range queries on the slider extremely fast (indexed column lookup) without any computation overhead.

### 4.2 Name Data Separation from Yearly Stats
The `names` table contains all pre-aggregated fields needed for Browse and Swipe (rank, percentile, total births, peak). The `name_yearly_stats` table is only queried when a user opens the Name Detail view. This keeps the primary Browse/Swipe payload small.

### 4.3 Swipe History Unique Constraint
`SwipeHistory` has a unique constraint on `(userId, nameId)`. If a user swipes on a name they have already decided on (e.g., after resetting and re-encountering it), the row is updated with the new decision via `UPSERT`. This prevents duplicate rows.

### 4.4 List Entry Ordering
`position` is a float or integer that supports reordering without requiring updating all rows. A gap-based integer scheme (multiples of 1000) allows insertion between items without full re-index. If gaps collapse, a reindex operation is triggered client-side.

### 4.5 Refresh Token Security
The actual refresh token is a cryptographically random 256-bit value sent to the client. The server stores only `SHA-256(token)` in the `tokenHash` column. This ensures that even if the `refresh_tokens` table is compromised, the tokens themselves cannot be used.

---

## 5. Indexes

| Table | Index | Purpose |
|---|---|---|
| `names` | `(gender, popularity_rank)` | Browse list ordered by rank within gender |
| `names` | `(gender, popularity_percentile)` | Slider filter range queries |
| `names` | `(name)` | Name search / lookup by string |
| `name_yearly_stats` | `(name_id)` | Fetch all years for a given name |
| `name_yearly_stats` | `(year)` | Bulk operations during pipeline |
| `users` | `(email)` | Login lookup |
| `refresh_tokens` | `(token_hash)` | Token validation on each refresh |
| `refresh_tokens` | `(user_id)` | Revoke all tokens for a user |
| `lists` | `(user_id)` | All lists for a user |
| `lists` | `(user_id, type)` | Fetch system lists (LIKED/PASSED) |
| `list_entries` | `(list_id, position)` | Ordered entries within a list |
| `swipe_history` | `(user_id)` | All swipes for a user |
| `swipe_history` | `(user_id, decision)` | Liked/passed subsets |

---

## 6. Data Volumes (Estimated)

| Table | Row Count | Storage Estimate |
|---|---|---|
| `names` | ~100,000 | ~20 MB |
| `name_yearly_stats` | ~5,000,000 (100 years × ~50k names avg) | ~400 MB |
| `users` | Variable (consumer app) | Small until scale |
| `swipe_history` | ~200 rows/user average × user count | Variable |
| `lists` / `list_entries` | ~50 entries/user average × user count | Variable |

The name data tables are the largest and are effectively static. They should be backed up separately from the user data tables and can be restored independently if needed.

---

## 7. Redis Cache Schema

| Key Pattern | Value | TTL | Description |
|---|---|---|---|
| `names:list:M` | JSON array of Name objects (male) | 24h | Full male name list for Browse/Swipe |
| `names:list:F` | JSON array of Name objects (female) | 24h | Full female name list for Browse/Swipe |
| `names:dist:M` | JSON array[100] of bucket counts (male) | 24h | Distribution histogram data |
| `names:dist:F` | JSON array[100] of bucket counts (female) | 24h | Distribution histogram data |
| `names:detail:{id}` | JSON object with yearly stats | 48h | Name detail + yearly stats |

All cache keys are invalidated (deleted) when the data pipeline runs a fresh ingestion.

---

## 8. Data Migration Strategy

- All schema changes are managed via Prisma Migrate.
- Migrations are version-controlled in `prisma/migrations/`.
- Migrations are run as part of the API deployment step (before the new server starts).
- Destructive migrations (dropping columns, tables) require an explicit review step in the CI/CD pipeline — a manual approval gate is enforced in GitHub Actions before deployment.
- The name data tables are managed separately from user data migrations. Re-ingesting name data does not require a schema migration — it is a data replacement operation handled by the pipeline scripts.

---

## 9. Backup Strategy

| Data | Backup Method | Frequency | Retention |
|---|---|---|---|
| Name data (static) | Managed DB snapshots | Weekly | 4 snapshots |
| User data (dynamic) | Managed DB snapshots + WAL archiving | Daily | 30 days |
| User data (point-in-time) | WAL archiving (via Supabase/Neon) | Continuous | 7 days |

A user data export feature (GDPR-style) is planned for v1.1 — users can download all their data as JSON.
