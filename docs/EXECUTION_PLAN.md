# Execution Plan
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Engineering Lead / Project Lead

---

## Overview

This plan organizes development into sequential phases, each building on the last. Phases are ordered by dependency — a phase is not started until its predecessors are complete and accepted. Work within a phase may proceed in parallel across disciplines (engineering, design, data).

There are no timeline commitments in this document. Duration depends on team size, resource availability, and findings during implementation.

---

## Phase Ownership

| Role | Responsibilities |
|---|---|
| **Data Engineer (DE)** | SSA pipeline, database schema, data quality |
| **Backend Engineer (BE)** | API server, auth, business logic |
| **Frontend Engineer (FE)** | Expo app, screens, components, gestures |
| **Design (DX)** | Component design, visual specs, prototypes |
| **QA** | Test plans, regression testing, device testing |
| **DevOps** | CI/CD, infrastructure provisioning, deployments |

---

## Phase 0: Foundation

**Goal:** Development environment, infrastructure, and tooling are ready. No product features.

### Deliverables

#### Infrastructure & DevOps
- [ ] Monorepo scaffolded (`babyname/`) with Turborepo, npm workspaces, shared TypeScript config
- [ ] `apps/mobile` — Expo SDK project created, Expo Router configured, EAS project initialized
- [ ] `apps/api` — Fastify + Prisma project created with basic healthcheck endpoint
- [ ] `packages/shared-types` — workspace initialized, Zod installed
- [ ] `packages/data-pipeline` — workspace initialized
- [ ] Docker Compose file for local PostgreSQL + Redis
- [ ] GitHub repository created with branch protection rules (require PR review, require CI pass)
- [ ] CI pipeline (GitHub Actions) running: lint, type-check, test
- [ ] Staging environment provisioned: API server, PostgreSQL, Redis (cloud hosting chosen and configured)
- [ ] Production environment provisioned (can be empty shell at this stage)
- [ ] Secrets management configured (Doppler or equivalent)

#### Design
- [ ] Design tokens finalized (colors, typography, spacing — from UI/UX spec)
- [ ] Component library scaffolded in design tool (Figma)
- [ ] Core component designs completed: NameListItem, SwipeCard, SegmentedControl, RangeSlider, DistributionCurve skeleton

#### Database
- [ ] Prisma schema written (from DATA_ARCHITECTURE.md)
- [ ] Initial migration applied to local and staging databases
- [ ] Seed script for development: 100 mock name records + 1 test user

### Acceptance Criteria
- `npm run dev` starts Expo + API server concurrently with no errors
- Healthcheck endpoint `GET /v1/health` returns 200 on staging
- Expo app loads on iOS Simulator, Android Emulator, and localhost web
- CI passes on a blank PR (lint, type-check, test all green)
- Staging DB has schema applied and test seed loaded

---

## Phase 1: Data Pipeline

**Goal:** All 100 years of SSA name data is ingested, processed, and queryable in the database.

### Deliverables

#### Data Engineer
- [ ] `packages/data-pipeline` — download step implemented and tested
- [ ] Parse step: all year files parsed, validation checks passing
- [ ] Aggregate step: yearly stats + name-level aggregations computed
- [ ] Rank + percentile computation for both genders
- [ ] Per-year rank computation (for trend chart)
- [ ] Database load step: `names` table and `name_yearly_stats` table populated
- [ ] Distribution histogram computation + Redis caching step
- [ ] Data quality checks implemented and passing (from DATA_PIPELINE.md §8)
- [ ] CLI commands: `pipeline:run`, `pipeline:dry-run`, `pipeline:post-process`
- [ ] Pipeline documented with README in `packages/data-pipeline/`

#### Backend Engineer
- [ ] `GET /v1/names` endpoint — returns paginated name list with percentile data
- [ ] `GET /v1/names/:nameId` endpoint — returns full name with yearly stats
- [ ] `GET /v1/names/distribution` endpoint — returns histogram buckets
- [ ] Redis caching applied to all three name endpoints
- [ ] Integration tests for all three endpoints

### Acceptance Criteria
- `npm run pipeline:run` completes without errors on a clean staging DB
- Post-pipeline DB contains ≥ 95,000 records in `names` table
- `name_yearly_stats` contains records from at least 1920 through the most recent SSA year
- Data quality check: Olivia (F) is in ≥ 99th percentile; average birth name like "Bob" (M) is mid-range
- `GET /v1/names?gender=F&limit=100` returns 100 records with correct shape in < 200ms
- `GET /v1/names/42` (any valid ID) returns yearly stats array with 50+ years of data
- `GET /v1/names/distribution?gender=F` returns exactly 100 buckets summing to total female name count

---

## Phase 2: Authentication

**Goal:** Users can register, log in, log out, verify email, and reset password. Token lifecycle is fully implemented.

### Deliverables

#### Backend Engineer
- [ ] `POST /v1/auth/register` — creates user, sends verification email
- [ ] `POST /v1/auth/login` — returns access token + sets refresh cookie
- [ ] `POST /v1/auth/refresh` — silent token refresh
- [ ] `POST /v1/auth/logout` — revokes refresh token
- [ ] `POST /v1/auth/verify-email` — marks email verified
- [ ] `POST /v1/auth/forgot-password` — sends reset email
- [ ] `POST /v1/auth/reset-password` — validates token, updates password, revokes all refresh tokens
- [ ] Auth middleware applied to all `[AUTH]` endpoints
- [ ] Rate limiting on login and registration endpoints
- [ ] Resend email integration for verification and reset emails
- [ ] Integration tests for full auth flow
- [ ] Security review: token storage, error messages, brute force mitigation

#### Frontend Engineer
- [ ] Login screen UI (from UI/UX spec)
- [ ] Registration screen UI
- [ ] Auth state managed in Zustand (`useAuthStore`)
- [ ] Access token stored in memory; refresh token in SecureStore (native) / cookie (web)
- [ ] Axios/Fetch interceptor: auto-refresh on 401, single in-flight refresh promise
- [ ] Redirect logic: unauthenticated users attempting to access protected screens are shown auth prompt
- [ ] "Forgot Password" flow UI

#### Design
- [ ] Login screen designs
- [ ] Registration screen designs
- [ ] Email templates designed (verification, password reset)

### Acceptance Criteria
- Full registration → email verify → login → token refresh → logout cycle works end-to-end on all platforms
- Access token expires in 15 minutes and is refreshed automatically without user action
- Incorrect password returns 401 with identical message to non-existent email
- Rate limiter blocks login after 10 attempts per minute per IP and returns 429
- Password reset flow sends a functional email and allows password change

---

## Phase 3: Browse Screen

**Goal:** The Browse screen is fully functional with all filters, the distribution curve, last name preview, and the name detail view.

### Deliverables

#### Frontend Engineer
- [ ] `PreferencesStore` (Zustand): `lastName`, `genderPreference`, `popularityMin`, `popularityMax`
- [ ] Browse screen layout with virtualized name list (`FlashList`)
- [ ] A–Z section headers and right-edge scrubber
- [ ] Name list item component: name + last name preview, gender indicator, percentile badge
- [ ] Gender segmented control (connected to PreferencesStore)
- [ ] Last name input field (Browse filter panel + Settings screen)
- [ ] `RangeSlider` component: two-ended, 0–100, real-time update
- [ ] `DistributionCurve` component: SVG, 100 buckets, in-range fill, animated
- [ ] "X names in range" counter
- [ ] Client-side filter logic: `useMemo` computing filtered list from full cached name list
- [ ] TanStack Query setup: `GET /names` paginated fetching + caching strategy
- [ ] Name detail screen: layout, trend chart (`Victory Native XL`), stats panel
- [ ] Chart: pinch-to-zoom, tap tooltip
- [ ] Add to List button (sheet UI — list selection)
- [ ] Like / Pass buttons on detail screen (calls swipe API)
- [ ] Empty state for Browse (no results)
- [ ] Loading skeleton for name list

#### Backend Engineer
- [ ] `GET /v1/users/me` endpoint
- [ ] `PATCH /v1/users/me` endpoint (lastName, genderPref)

#### QA
- [ ] Test plan for Browse screen: filters, edge cases, all device sizes
- [ ] Cross-platform test pass: iOS, Android, Web (desktop + mobile)

### Acceptance Criteria
- Full name list (both genders) loads and renders within 1 second on a clean cache
- Scrolling the full list at 60fps on mid-range test device (iPhone 12 equivalent)
- Adjusting the slider updates the list and curve within 150ms
- Distribution curve accurately reflects the power-law shape (buckets 0–20 have higher counts than 80–100)
- Name count label is always accurate (matches actual filtered list length)
- Name detail view loads chart within 500ms on cached data
- Trend chart renders correctly for a name with 100+ years of data (e.g., "Mary")
- Trend chart handles names with < 10 years of data (e.g., newly coined names)
- Last name preview updates on all visible list items within one render cycle of typing

---

## Phase 4: Swipe Screen

**Goal:** The Swipe screen is fully functional with gesture physics, decision saving, filters, undo, and completion states.

### Deliverables

#### Frontend Engineer
- [ ] `SwipeCard` component: layout, animations, overlay (Reanimated + Gesture Handler)
- [ ] Swipe gesture: directional detection, snap threshold, velocity threshold
- [ ] Card exit animation (swipe direction) + next card enter animation
- [ ] "LIKE" / "PASS" overlay label that fades in during drag
- [ ] ✓ / ✗ action buttons with same animation trigger
- [ ] Undo button and undo state management (one level)
- [ ] Deck management: shuffle (Fisher-Yates), exclude already-swiped names, track remaining count
- [ ] Swipe decision saving: POST to API immediately; queue in MMKV if offline
- [ ] Offline sync: detect reconnection, flush MMKV queue via `POST /swipes/batch`
- [ ] Swipe screen filter panel (gender + popularity slider — simplified, no distribution curve)
- [ ] Tap card → Name Detail view
- [ ] Completion state (deck exhausted) with reset options
- [ ] Haptic feedback on swipe decision (iOS + Android)
- [ ] Keyboard shortcut support on web (→ like, ← pass, Z undo)
- [ ] "Names remaining" counter

#### Backend Engineer
- [ ] `GET /v1/swipes/history` endpoint
- [ ] `POST /v1/swipes` endpoint (single swipe)
- [ ] `POST /v1/swipes/batch` endpoint
- [ ] `DELETE /v1/swipes/:nameId` endpoint
- [ ] `DELETE /v1/swipes` endpoint (reset all history)
- [ ] Swipe history automatically updates Liked/Passed system lists

#### QA
- [ ] Gesture test plan: swipe, button tap, undo, velocity threshold, simultaneous touches
- [ ] Offline scenario testing
- [ ] Performance: 60fps card animations on mid-range device

### Acceptance Criteria
- Swipe right adds to Liked list; swipe left adds to Passed list (confirmed in Lists screen)
- Card animations run at 60fps on mid-range test device with no jank
- Fast flick (> 800px/s) always registers as a swipe regardless of distance
- Slow drag released below threshold snaps back with bounce animation
- Undo correctly reverses the last swipe decision (UI and data)
- Swipe decisions persist across app restarts (confirmed by reopening app and checking lists)
- Offline queuing: 10 swipes made offline → reconnect → all 10 appear in Liked/Passed lists
- Deck excludes all previously swiped names on session start
- Swipe screen filters (gender, popularity) correctly limit the deck

---

## Phase 5: Lists & Account Management

**Goal:** All list management features and user profile settings are complete and functional.

### Deliverables

#### Frontend Engineer
- [ ] Lists overview screen: system lists + custom lists, entry counts
- [ ] List detail screen: name entries, sort toggle, paginated loading
- [ ] Name list item in list detail (same component as Browse, with delete swipe gesture)
- [ ] Create new list (bottom sheet, name input)
- [ ] Rename list (tap title to edit inline)
- [ ] Delete list (confirmation dialog)
- [ ] Drag-to-reorder within list (native + web)
- [ ] Add to List sheet (from Name Detail view): shows all lists, checks already-added state
- [ ] Profile/Settings screen: last name, gender pref, account management section
- [ ] Change email flow (UI)
- [ ] Change password flow (UI)
- [ ] Delete account flow (confirmation + password entry)
- [ ] "Reset Swipe History" confirmation flow

#### Backend Engineer
- [ ] `GET /v1/lists` endpoint
- [ ] `POST /v1/lists` endpoint
- [ ] `GET /v1/lists/:id` endpoint (with pagination)
- [ ] `PATCH /v1/lists/:id` endpoint
- [ ] `DELETE /v1/lists/:id` endpoint
- [ ] `POST /v1/lists/:id/entries` endpoint
- [ ] `DELETE /v1/lists/:id/entries/:nameId` endpoint
- [ ] `PATCH /v1/lists/:id/entries/reorder` endpoint
- [ ] `PATCH /v1/users/me/email` endpoint
- [ ] `PATCH /v1/users/me/password` endpoint
- [ ] `DELETE /v1/users/me` endpoint

#### QA
- [ ] Lists CRUD test plan
- [ ] Reordering test (drag, API sync)
- [ ] Account deletion (data removal verification)

### Acceptance Criteria
- Liked and Passed lists are automatically populated by swipe decisions
- Creating, renaming, and deleting custom lists works correctly
- Drag-to-reorder persists after app restart (position synced to server)
- Adding a name to a list from the detail view is reflected in the list immediately
- Account deletion removes all user data (verified by attempting login after deletion → 401)
- Profile last name preference syncs across devices (set on one device, visible on another after re-login)

---

## Phase 6: Guest Mode & Account Migration

**Goal:** Guest users can use the app without an account, and their data migrates cleanly on registration.

### Deliverables

#### Frontend Engineer
- [ ] Guest mode: all swipe decisions saved to MMKV under a `guest_swipes` key
- [ ] Guest mode: last name and gender pref saved to MMKV
- [ ] Browse screen: works fully in guest mode
- [ ] Swipe screen: works fully in guest mode (decisions save locally)
- [ ] Lists tab: show sign-up prompt for guests
- [ ] Profile tab: show login/register CTAs for guests
- [ ] After 10 swipes (guest): show dismissible account creation prompt
- [ ] Registration flow: attach local swipe history to registration payload
- [ ] Login flow: merge local swipe history with server data, server wins on conflicts
- [ ] Post-migration: clear MMKV guest data

#### Backend Engineer
- [ ] `POST /v1/auth/register` extended to accept `localHistory` payload
- [ ] Merge logic: upsert swipe history, server wins on conflict
- [ ] Limit: max 5000 swipes in `localHistory`

### Acceptance Criteria
- Guest user can complete 50+ swipes, close the app, and see decisions intact on next open
- Registration with local history: all local swipes appear in account Liked/Passed lists after registration
- Login with local history: non-conflicting local swipes merged; conflicting swipes defer to server
- After migration, MMKV contains no guest swipe data

---

## Phase 7: Polish, Performance & Accessibility

**Goal:** The app is production-ready: performant, accessible, tested across all platforms and device sizes.

### Deliverables

#### Frontend Engineer
- [ ] Accessibility audit: all screens pass VoiceOver (iOS) and TalkBack (Android)
- [ ] All keyboard navigation paths work on web
- [ ] All interactive elements meet 44pt minimum touch target
- [ ] Contrast ratios verified for all color combinations
- [ ] Swipe card announces decision via `AccessibilityInfo.announceForAccessibility`
- [ ] Orientation support: Browse and Lists work in landscape on iPad
- [ ] Tablet layout: Browse uses two-column layout on iPad/large screen
- [ ] Web desktop layout: left sidebar navigation, two-column Browse
- [ ] Skeleton loaders on all data-loading states
- [ ] Error states on all screens (network error + retry button)
- [ ] Toast notification system for offline swipe queuing
- [ ] App icon + splash screen designed and implemented
- [ ] Dark mode support (system-level, follows device preference)

#### QA
- [ ] Full regression test pass on: iPhone SE (small), iPhone 15 Pro (standard), iPad Pro 12.9" (large)
- [ ] Full regression test pass on: Pixel 6a (small Android), Samsung Galaxy Tab (Android tablet)
- [ ] Web: Chrome, Safari, Firefox, Edge
- [ ] Performance profile: browse scroll FPS, swipe animation FPS, memory usage
- [ ] Screen reader test pass (VoiceOver + TalkBack)
- [ ] Network condition testing: 3G throttle, offline, intermittent connection

#### DevOps
- [ ] Production environment fully configured
- [ ] App Store Connect + Google Play Console set up
- [ ] EAS Build configured for production release signing
- [ ] Sentry error tracking active in production
- [ ] PostHog analytics active

### Acceptance Criteria
- All WCAG AA contrast ratios pass
- VoiceOver and TalkBack can navigate all primary flows without assistance
- Browse list scrolls at 60fps on iPhone 12 equivalent with 50,000 names loaded
- Swipe animations at 60fps on iPhone 12 equivalent
- No memory leak detected over a 15-minute swipe session (Instruments / Android Profiler)
- App builds pass EAS Build for both iOS and Android without errors
- All P0 (critical) and P1 (high) bugs resolved

---

## Phase 8: App Store Submission & Launch

**Goal:** App is submitted to App Store and Google Play, and the web version is deployed to production.

### Deliverables

- [ ] App Store screenshots created (iPhone 6.7", iPad 12.9")
- [ ] Google Play screenshots created
- [ ] App Store description, keywords, and metadata written
- [ ] Privacy policy written and hosted
- [ ] Terms of service written and hosted
- [ ] Age rating questionnaire completed (appropriate for general audiences)
- [ ] App submitted to App Store for review
- [ ] App submitted to Google Play for review
- [ ] Web deployed to production URL
- [ ] Custom domain configured with SSL
- [ ] Post-launch monitoring dashboard (Sentry + PostHog) verified active
- [ ] Runbook written: how to roll back a bad API deploy, how to run the pipeline manually

### Acceptance Criteria
- App approved and live on App Store
- App approved and live on Google Play
- Web accessible at production URL with valid SSL certificate
- Monitoring alerts configured for: API error rate > 1%, DB connection failures, P95 latency > 1s

---

## Post-Launch Backlog (v1.1+)

Items explicitly out of scope for v1.0, ordered by anticipated priority:

1. **Partner sync:** Share lists and compare swipe decisions with a partner account. See matched names (both liked).
2. **Name meanings and origin:** Integrate a name etymology database (Behindthename API or similar).
3. **State-level data:** SSA also publishes per-state data. Add a state filter to see regional popularity.
4. **Push notifications:** "New SSA data is available" or "Your partner swiped on a name you both liked!"
5. **AI name recommendations:** Based on liked names, suggest similar names using vector embeddings.
6. **Social sharing:** Share a name card as an image or share your liked list with a link.
7. **GDPR data export:** Download all personal data as JSON.
8. **International names:** Non-SSA databases for UK, Australia, European country data.
9. **Pronunciation audio:** Text-to-speech or recorded audio for name pronunciation.
10. **In-app name comparison:** Side-by-side trend chart for two names.

---

## Testing Strategy

### Test Types

| Type | Tool | Coverage Target |
|---|---|---|
| Unit (API) | Vitest | All service layer functions |
| Integration (API) | Vitest + Supertest | All endpoints with success + error cases |
| Unit (Frontend) | Vitest + React Native Testing Library | All custom hooks, store logic |
| Component (Frontend) | Vitest + React Native Testing Library | All shared components |
| End-to-End | Detox (native) / Playwright (web) | Core user journeys |
| Performance | Expo dev tools + Instruments | FPS, memory, startup time |
| Accessibility | Axe (web), manual VoiceOver/TalkBack | All screens |

### Core E2E Journeys (Must Pass Before Each Release)
1. Guest: Open app → Browse names → Apply filters → Open detail → Swipe 5 names → View Liked list prompt
2. Registration: Register → Verify email → Set last name → Browse → Swipe → View Liked list → Log out → Log in → Verify data persisted
3. Account migration: Swipe 10 names as guest → Register → Verify all 10 appear in Liked/Passed
4. Full Browse: Load Browse → Filter by Girl → Set slider to 80–100 → Verify ≤ 50 names → Tap a name → Verify trend chart loads

---

## Definition of Done

A feature is **Done** when:

1. All acceptance criteria in the relevant feature spec pass.
2. Unit and integration tests are written and passing.
3. The feature has been code-reviewed by at least one other engineer.
4. CI pipeline is green (lint, type-check, tests).
5. The feature has been manually tested on at least one iOS device, one Android device, and web (desktop + mobile).
6. No new P0 or P1 bugs introduced.
7. Any new API endpoints are documented in API_SPEC.md (or have an open PR to update it).
8. Accessibility requirements for the feature are met.
