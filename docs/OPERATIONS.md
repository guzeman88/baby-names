# Operations Guide

Practical reference for deploying, maintaining, and troubleshooting the Baby Names app in production.

---

## Live URLs

| Service | URL |
|---|---|
| Web app (PWA) | https://baby-names-kohl.vercel.app / https://shrimpyapp.vercel.app |
| REST API | https://babynames-api.onrender.com |
| Health check | https://babynames-api.onrender.com/v1/health |
| GitHub repository | https://github.com/guzeman88/baby-names |

---

## Infrastructure

### Backend API — Render

- **Service**: `babynames-api` (`srv-d7u098osfn5c73ci3ia0`), Free tier, Node.js
- **Database**: `babynames-db` (`dpg-d7u08t0sfn5c73ci37qg-a`), Free PostgreSQL
- **Region**: Oregon (US West)
- **Cold start**: ~60–90 seconds on free tier (sleeps after 15 min idle)
- **DB expiry**: Free Postgres instances expire on **June 5, 2026** — upgrade before then or all data is lost
- **Blueprint**: `render.yaml` in repo root manages service config

Start command (from `render.yaml`):
```
cd apps/api && npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js
```

On every startup Render:
1. Runs pending DB migrations
2. Seeds 581 hardcoded sample names (idempotent upserts)
3. Starts the API server
4. After server is ready, spawns `scripts/maybe-run-pipeline.ts` in the background if name count < 10,000

### Frontend — Vercel

- **Project**: `shrimpyapp` (`prj_9cuEj0MG3J0r47t0QYCQFldXdU9q`)
- **Org**: `guzeman88-7338` / team `team_XFGTZa1a7I91NQ5k3FK2J5up`
- **Build**: `cd apps/mobile && npx expo export --platform web`
- **Output directory**: `apps/mobile/dist`
- **SPA routing**: All paths rewrite to `index.html` via `vercel.json`

Manual deploy (if auto-deploy is broken):
```powershell
cd "path/to/Names_1"
vercel deploy --prod
```

---

## Environment Variables

### API (`apps/api`) — set in Render dashboard

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for signing access JWTs (15 min expiry) | Yes |
| `JWT_REFRESH_SECRET` | Secret for signing refresh JWTs (30 day expiry) + cookie signing | Yes |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `https://baby-names-kohl.vercel.app`) | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | Port the server binds to (Render sets this automatically) | Yes |
| `SENTRY_DSN` | Sentry error tracking (optional) | No |

### Mobile (`apps/mobile`) — set in Vercel dashboard or `.env.local`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL, e.g. `https://babynames-api.onrender.com/v1` |

---

## CI / CD

### GitHub Actions

Two workflows:

**`.github/workflows/deploy.yml`** — Vercel deploy on push to `main`
- **STATUS: BROKEN** — uses a GitHub secret `VERCEL_TOKEN` that has expired
- Until fixed, use `vercel deploy --prod` manually after each push

To fix:
1. Go to https://vercel.com/account/tokens
2. Create a new token scoped to the **guzeman88-yahoocoms-projects** team
3. Run: `gh secret set VERCEL_TOKEN --body "NEW_TOKEN" -R guzeman88/baby-names`

**`.github/workflows/keepalive.yml`** — Pings the Render API every 10 minutes
- Prevents the free-tier instance from sleeping during active use
- Sends `GET /v1/health` with a 120-second timeout

### Render Auto-Deploy

Render watches `main` branch and redeploys automatically on every push.
Build time is typically 3–5 minutes.

---

## Data Pipeline

### Overview

The SSA data pipeline lives in `packages/data-pipeline/`. It downloads ~7MB of US baby name data from the Social Security Administration and loads it into PostgreSQL.

**6 steps:**
1. **Download** — fetches `names.zip` from SSA.gov (or a GitHub mirror as fallback)
2. **Extract** — unzips 146 year files (`yob1880.txt` … `yob2024.txt`) to `/tmp`
3. **Parse** — reads each CSV file (`name,sex,births` per line)
4. **Aggregate** — sums births per name/gender across all years; computes recent births (last 10 years), first/last year, peak rank/year
5. **Compute ranks** — ranks all names by recent births within each gender; computes percentile
6. **Load to database** — clears existing name data (preserves user data), bulk-inserts in chunks of 500

Result: ~29,000 name/gender combinations, each with yearly birth stats from 1880–2024.

### Known Issue: SSA.gov Blocks Automated Downloads

SSA.gov returns HTTP 403 to server-side requests regardless of headers. This means the pipeline **cannot download the zip on Render's servers directly**.

**Fix (committed `5258136`):** `download.ts` now falls back to a GitHub release mirror when SSA.gov fails:
```
Primary:  https://www.ssa.gov/oact/babynames/names.zip
Fallback: https://github.com/guzeman88/baby-names/releases/download/v1.0-data/ssa-names.zip
```

The GitHub release `v1.0-data` contains the full `ssa-names.zip` (7.7 MB). This is public and downloadable from Render's servers.

### Running the Pipeline Manually (Local)

If you already have the zip downloaded locally:
```powershell
$env:DATABASE_URL = "postgresql://..."  # your connection string
cd packages/data-pipeline
npx tsx src/index.ts --zip="C:\path\to\ssa-names.zip"
```

The `--zip=PATH` flag skips the download step entirely.

### Why Only 581 Names?

Before commit `5258136`, every Render startup would:
1. Run `seed.ts` → upsert 300 female + 300 male hardcoded names (581 after deduplication)
2. Spawn the pipeline → pipeline tries SSA.gov → gets 403 → silently fails (spawned with `stdio: 'ignore'`)

After the fix, the pipeline falls back to GitHub and loads the full dataset.
If you're still seeing 581 names on the live site, trigger a manual Render redeploy.

---

## Database Schema

Seven models in Prisma:

| Model | Purpose |
|---|---|
| `Name` | One row per name/gender pair. Stores popularity stats. |
| `NameYearlyStat` | Per-year birth count and rank for each name |
| `User` | App users (email + bcrypt hash) |
| `RefreshToken` | Active refresh tokens (stored as SHA-256 hash) |
| `EmailVerification` | Email verification tokens |
| `List` | User-created name lists (types: LIKED, PASSED, CUSTOM) |
| `ListEntry` | Names inside a list, with position ordering |
| `SwipeHistory` | Per-user swipe decisions (LIKED or PASSED) |

---

## API Routes

Base URL: `https://babynames-api.onrender.com/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Sign in, returns access token + sets refresh cookie |
| POST | `/auth/refresh` | cookie | Rotate refresh token, return new access token |
| POST | `/auth/logout` | ✓ | Revoke refresh token |
| POST | `/auth/forgot-password` | — | Send password reset email |
| POST | `/auth/reset-password` | — | Apply new password from reset token |
| POST | `/auth/verify-email` | — | Verify email address |
| GET | `/names` | — | Paginated name list with filters (gender, percentile, sort) |
| GET | `/names/distribution` | — | Popularity histogram buckets |
| GET | `/names/:id` | — | Name detail + yearly trend data |
| POST | `/swipes` | ✓ | Record a swipe (LIKED or PASSED) |
| GET | `/swipes/history` | ✓ | Retrieve user's swipe history |
| GET | `/lists` | ✓ | All lists for the current user |
| POST | `/lists` | ✓ | Create a new custom list |
| GET | `/lists/:id` | ✓ | List detail with all entries |
| PATCH | `/lists/:id` | ✓ | Rename a list |
| DELETE | `/lists/:id` | ✓ | Delete a list |
| POST | `/lists/:id/entries` | ✓ | Add a name to a list |
| DELETE | `/lists/:id/entries/:nameId` | ✓ | Remove a name from a list |
| GET | `/users/me` | ✓ | Get current user profile |
| PATCH | `/users/me` | ✓ | Update profile (lastName, genderPref) |

Auth uses Bearer tokens in the `Authorization` header. The refresh token is stored in an HttpOnly cookie.

---

## Frontend App Structure

Built with Expo SDK 52 + Expo Router v4, exported as a static web app.

```
apps/mobile/
├── app/
│   ├── _layout.tsx          # Root layout: QueryClient, auth restore, SW registration
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar (Browse, Swipe, Lists, Profile)
│   │   ├── index.tsx        # Browse tab — paginated name list with filters
│   │   ├── swipe.tsx        # Swipe tab — Tinder-style card swiping
│   │   ├── lists.tsx        # Lists tab — view LIKED list and custom lists
│   │   └── profile.tsx      # Profile tab — account info, gender pref, logout
│   ├── auth/
│   │   ├── login.tsx        # Login screen
│   │   └── register.tsx     # Register screen
│   ├── name/
│   │   └── [id].tsx         # Name detail modal — popularity chart, trend data
│   └── lists/
│       └── [id].tsx         # Custom list detail — entries, reorder, delete
├── stores/
│   ├── authStore.ts         # Zustand: user session, login/logout/refresh
│   ├── preferencesStore.ts  # Zustand (persisted): gender filter, sort, percentile range
│   └── swipeStore.ts        # Zustand (persisted): swipe decisions cache
├── lib/
│   ├── api.ts               # Typed API client (fetch wrapper + all API methods)
│   ├── analytics.ts         # Optional analytics (no-op if env vars absent)
│   └── guestStorage.ts      # Local swipe storage for unauthenticated users
└── public/
    ├── favicon.png          # 32×32 teddy bear icon
    ├── icon-192.png         # PWA icon 192×192
    ├── icon-512.png         # PWA icon 512×512
    └── sw.js                # Service worker (offline support)
```

---

## Test Account

Available after seeding:
- Email: `test@babynames.dev`
- Password: `TestPass1`

---

## Common Tasks

### Trigger a full pipeline run on Render

Push any commit to `main` — Render redeploys automatically and the pipeline runs on startup if name count < 10,000.

Or trigger a manual deploy from the Render dashboard → `babynames-api` → **Manual Deploy**.

### Deploy frontend manually

```powershell
cd "path/to/Names_1"
vercel deploy --prod
```

### Check Render logs

Go to: https://dashboard.render.com/web/srv-d7u098osfn5c73ci3ia0/logs

### Rotate JWT secrets

1. Generate new secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update them in Render dashboard → `babynames-api` → Environment
3. Redeploy — all existing refresh tokens become invalid (users must log in again)
