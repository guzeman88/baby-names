# Feature Specifications
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Engineering Lead / Product Manager

---

## Overview

This document provides detailed behavioral specifications for each feature. It is intended to disambiguate edge cases, define exact business logic, and serve as the source of truth when PRD and implementation intent conflict. Each feature spec contains: description, acceptance criteria, edge cases, and implementation notes.

---

## Feature 1: Alphabetical Browse List

### Description
The primary Browse screen presents all names in alphabetical order within the current filter state. The list is the entry point for data-oriented name discovery.

### Acceptance Criteria
- [ ] Names are sorted A–Z by first character, then alphabetically within each letter group.
- [ ] Names appear with their associated last name preview if a last name is set (e.g., "Emma Johnson").
- [ ] Each list item displays the name, gender indicator, and popularity percentile.
- [ ] The list renders at 60fps while scrolling even with 50,000+ visible items (requires virtualized/windowed list via `FlashList` or equivalent).
- [ ] A letter-indexed scrubber on the right edge enables jumping to any letter.
- [ ] Tapping a list item opens the Name Detail view.
- [ ] The list updates within 150ms of any filter change, with no visible blank flash.

### Edge Cases
- **No results:** If the current filter combination yields zero names, display the empty state message and a "Reset Filters" button. The list itself is not rendered.
- **Names starting with numbers or special characters:** None exist in the SSA dataset. If data anomalies introduce any, they are placed at the top of the list before "A".
- **Very long names:** The SSA dataset has names up to ~15 characters. Ensure list item layout handles these gracefully without truncation (use flex wrapping or a slightly smaller font for items > 12 characters).
- **Last name makes combined display too long:** If `firstName + " " + lastName > 24 characters`, display the full name on two lines (name above, last name below in secondary style). Do not truncate.
- **Both genders selected:** A name may exist for both M and F (e.g., "Jordan"). These are two separate entries — `Jordan (M)` and `Jordan (F)` — each with their own gender indicator and ranking data.

### Implementation Notes
- Use `FlashList` from `@shopify/flash-list` (not `FlatList`) — it is significantly faster for large lists and supports sticky section headers for the A–Z grouping.
- The full name list for a given gender is fetched once and cached in TanStack Query. Filter operations are applied client-side using `useMemo` to avoid unnecessary re-computation.
- The section header (letter) should be sticky at the top as you scroll through each letter group.
- On web (desktop), render the A–Z scrubber as a left-aligned fixed-position column.

---

## Feature 2: Last Name Preview

### Description
Users can enter their family last name so that all name displays throughout the app show the full name combination (e.g., "Emma Johnson"), allowing them to evaluate how the first name sounds and looks with their last name.

### Acceptance Criteria
- [ ] A text input for "Last Name" is accessible from the Browse screen filter panel and from the Profile/Settings screen.
- [ ] Entering a last name immediately updates all name displays in Browse (and in Swipe cards, and in detail views) without requiring a submit action.
- [ ] The last name is stored in the user's profile (if logged in) and synced across devices.
- [ ] For guest users, the last name is stored locally (MMKV) and persists across app sessions.
- [ ] The last name field accepts letters, hyphens, apostrophes, and spaces only (validation: `/^[A-Za-z' -]{0,64}$/`).
- [ ] Clearing the last name field removes the preview and shows only the first name.

### Edge Cases
- **Last name with special characters:** Hyphenated last names (e.g., "Smith-Jones") and names with apostrophes (e.g., "O'Brien") must be accepted and displayed correctly.
- **Very long last name:** Max 64 characters enforced by input. If the combined display is long, see the layout note in Feature 1.
- **Last name with only spaces:** Treat as empty — strip whitespace before storing.
- **Last name changes during swipe session:** Updates the card being shown in real time. Does not affect the swipe deck order.

### Implementation Notes
- Store the last name value in a Zustand store (`usePreferencesStore`) so it is accessible from all screens without prop-drilling.
- The value is synced to the user profile via `PATCH /users/me` with a debounce of 1 second to avoid excessive API calls while typing.

---

## Feature 3: Gender Filter

### Description
Users can filter the name list and swipe deck to show only boy names, only girl names, or both.

### Acceptance Criteria
- [ ] Three states: **Boy**, **Girl**, **Both** (default).
- [ ] Changing the filter immediately re-renders the name list.
- [ ] The gender filter is visually a segmented control (3 options, single-select).
- [ ] The user's gender preference (set in Profile) serves as the default starting state.
- [ ] The filter state is preserved when the user switches between Browse and Swipe tabs (shared filter store).

### Edge Cases
- **Switching from "Both" to "Girl":** The list should scroll to the top (or maintain position if the first visible name is still in view). Prefer scrolling to top for simplicity.
- **Popularity rank / percentile with "Both" selected:** When "Both" is selected, the percentile shown for each name is the name's percentile within its own gender (not combined across genders). This is labeled clearly (e.g., "Top 5% of girl names").

---

## Feature 4: Popularity Percentile Slider

### Description
A two-ended range slider allowing users to filter names by their popularity percentile. Paired with the distribution curve visualization below it.

### Acceptance Criteria
- [ ] Slider has a minimum handle (left) and maximum handle (right), both draggable independently.
- [ ] Slider range: 0 to 100 (integer steps only).
- [ ] Both handles display their current value as a label above the handle while dragging.
- [ ] The list updates in real time as handles are dragged (no "apply" button required).
- [ ] The distribution curve below the slider updates in sync with handle movement.
- [ ] Default state: min = 0, max = 100 (all names shown).
- [ ] The two handles cannot cross each other. Minimum range = 1 percentile point.
- [ ] Name count display updates in real time as handles move.

### Edge Cases
- **Min and max handles at same value (e.g., both at 50):** Handles are prevented from crossing, so minimum separation is 1 (min = 49, max = 50 or min = 50, max = 51). If a handle is dragged into the other, it pushes the other handle by 1 step.
- **Filter yields 0 results:** Valid state. Show empty state. Slider stays in position.
- **Filter yields 1 result:** Valid. Show that one name.
- **"Both" gender selected:** Slider filters each gender by its own percentile separately. A name with 70th percentile for girls and 60th percentile for boys — when "Both" is selected and slider is set to 65–100 — the girl version appears (70th ≥ 65th) but the boy version does not (60th < 65th).

### Implementation Notes
- Use `@miblanchard/react-native-slider` or a custom implementation built on `react-native-gesture-handler` + `react-native-reanimated`.
- The filtering computation is: `names.filter(n => n.popularityPercentile >= minPct && n.popularityPercentile <= maxPct)`.
- This filter runs client-side on the in-memory name array. With ~50k names and a simple comparison, this is fast enough for real-time (< 5ms on modern devices).
- The name count label should display the result of `filteredNames.length` — update this synchronously in the same render cycle as the filter.

---

## Feature 5: Distribution Curve

### Description
A visual SVG/Canvas representation of name count density across the 100 popularity percentile buckets. The curve helps users understand the shape of the name population distribution and how their slider selection relates to the whole.

### Acceptance Criteria
- [ ] Renders as an SVG path below the popularity slider.
- [ ] Curve reflects the actual distribution: high/steep on the left (many rare names), low/flat on the right (few common names).
- [ ] The region between the slider's min and max handles is filled with the primary brand color at 40% opacity.
- [ ] The region outside the slider's selection is filled with a dimmed gray at 30% opacity.
- [ ] Two vertical dashed lines mark the exact min and max positions.
- [ ] The curve animates smoothly (300ms ease) when the slider handles move.
- [ ] Below the curve: "{X} names in range" label, updating in real time.
- [ ] Component height: exactly 56dp (density-independent pixels).

### Edge Cases
- **Single percentile selected (e.g., 50–51):** The filled region is very narrow — a thin sliver. Still renders correctly.
- **Full range (0–100) selected:** Entire curve area is filled with brand color. No dimmed regions.
- **Gender changes:** The curve data changes because the distribution shape differs between M and F names. The curve transitions with a fade animation (200ms).
- **Screen width changes (orientation, web resize):** The SVG is redrawn at the new width. Use `onLayout` to get the container width and re-render the SVG.

### Implementation Notes
- Pre-compute the bucket array (100 values) once on the client from the name list using `useMemo`. Recompute only when the name list or gender changes.
- The bucket array maps each name to a bucket: `bucket = Math.floor(name.popularityPercentile)`, clamped to 0–99.
- Smooth the curve using a bezier path through the bucket midpoints (not a bar chart). Use a Catmull-Rom or cardinal spline to create the smooth bezier.
- The SVG coordinate system: `x` maps to percentile (0–100), `y` maps to count (normalized to component height). Y-axis is inverted (0 at top, height at bottom).
- On web, render using `react-native-svg` (which works on web via the Expo web build). Do not use `<canvas>` directly.

---

## Feature 6: Name Detail View

### Description
A full-screen detail view for any name, showing a trend line chart of popularity over time plus key statistics.

### Acceptance Criteria
- [ ] Opened by tapping any name in Browse, any swipe card (tap, not swipe), or any list entry.
- [ ] Displays: name (large heading), gender label, trend chart, stats panel, action buttons.
- [ ] Trend chart shows annual birth counts for the name from the earliest available year to the most recent.
- [ ] Chart supports pinch-to-zoom (native) and scroll wheel zoom (web).
- [ ] Tapping a data point on the chart shows a tooltip with: Year, Births, Rank.
- [ ] Stats panel shows: Peak Rank, Peak Year, Most Recent Rank, Popularity Percentile, Total All-Time Births.
- [ ] "Like" and "Pass" buttons are present and functional (same effect as swiping).
- [ ] "Add to List" button opens a sheet where the user selects which list to add to.
- [ ] If the name is already liked, the Like button shows as active/filled.

### Edge Cases
- **Name only appears in very old data (e.g., pre-1950s, no recent data):** Show available data. The stats panel should note "Not in recent rankings" for the Most Recent Rank stat.
- **Name appears in only one year:** Chart renders as a single dot (not a line). Show a message: "Only appeared in SSA data in {year}."
- **User already liked this name:** Like button shows filled green state. Tapping it again removes the like (toggles decision to none) and removes from the Liked list. Same for Pass.
- **Guest user taps "Add to List":** Show a prompt to create an account first.
- **Slow network (detail data not cached):** Show skeleton loaders for the chart and stats while data loads. The name and gender are available immediately from the list item.

### Implementation Notes
- The yearly stats data is fetched from `GET /api/names/:nameId` and cached in TanStack Query for 24 hours. This call only happens when the detail view opens.
- The chart should normalize the Y-axis to the name's own data — do not compare against other names on the same Y-axis.
- On mobile, open as a modal sheet (bottom-sheet style) with a drag-to-dismiss handle. On web, open as a full route (`/browse/[nameId]`).

---

## Feature 7: Swipe Card Deck

### Description
The core engagement mechanism. Users swipe cards right (like) or left (pass) to make quick decisions on names presented one at a time.

### Acceptance Criteria
- [ ] Cards are presented in random order, seeded freshly each time the user enters the Swipe screen.
- [ ] Names previously swiped on (in any session) are excluded from the deck by default.
- [ ] The deck shows the current card prominently, with the next card slightly peeking behind/below it.
- [ ] Dragging a card shows directional visual feedback (green overlay + "LIKE" for right, red + "PASS" for left).
- [ ] Releasing above the snap threshold (40% screen width or 800px/s velocity) commits the swipe decision.
- [ ] Releasing below the snap threshold snaps the card back to center.
- [ ] After a swipe commits, the next card animates forward.
- [ ] Tapping the ✓ or ✗ buttons triggers the same animation and decision as swiping.
- [ ] The undo button reverses the last swipe (one level only). It is disabled when no undo is available.
- [ ] A counter at the top shows how many names remain in the current deck.
- [ ] All swipe decisions are saved immediately (sent to API; queued locally if offline).

### Edge Cases
- **Very fast swiping (before API call completes):** Swipe decisions are queued locally and sent as a batch. The UI should never block on an API call to advance the card.
- **Undo after quickly swiping twice:** Only one undo level. The second-to-last decision is not recoverable via undo; it will persist.
- **Network loss mid-session:** Decisions queue locally in MMKV. On reconnection, the queue is flushed via `POST /swipes/batch`. A non-blocking toast informs the user: "You're offline — swipes will sync when reconnected."
- **All cards exhausted:** Show the completion state. Do not loop back to previously-swiped names without explicit user action.
- **Filter changes while on Swipe screen:** The deck is rebuilt from scratch using the new filter. All pending decisions are synced before the rebuild. The counter updates to reflect the new deck size.
- **Name already in deck is tapped on detail view and liked:** The name is removed from the deck (since it's now decided). The deck count decrements.

### Implementation Notes
- The swipe deck is managed as a client-side array (shuffled). No deck management on the server.
- Shuffle algorithm: Fisher-Yates with `crypto.getRandomValues()` as the entropy source. Do not use `Math.random()` for shuffling.
- Pre-render the current card and the next 2 cards in the deck to ensure smooth transitions.
- The gesture recognizer should be set to receive gestures simultaneously with the scroll view (so swipe cards work even when embedded in a scrollable context on web).
- Use Reanimated's `useSharedValue` + `useAnimatedStyle` for all card animation to keep it on the UI thread.

---

## Feature 8: User Authentication

### Description
Account creation, login, token management, email verification, and password reset.

### Acceptance Criteria
- [ ] User can register with email and password.
- [ ] Password requirements: min 8 characters, at least 1 uppercase letter, at least 1 number.
- [ ] A verification email is sent on registration. The user can still use the app without verifying, but a banner prompts verification.
- [ ] User can log in with email and password.
- [ ] Access tokens expire in 15 minutes and are silently refreshed in the background.
- [ ] Refresh tokens expire in 30 days.
- [ ] User can log out, which revokes the current refresh token.
- [ ] User can reset their password via email link.
- [ ] Changing the password revokes all other active sessions.
- [ ] User can delete their account with password confirmation.
- [ ] Rate limit on login: 10 attempts per minute per IP.

### Edge Cases
- **Login with unverified email:** Allowed. A persistent banner appears: "Please verify your email — [Resend link]."
- **Registration with existing email:** Returns 409 Conflict. Error message: "An account with this email already exists." — do not differentiate between email+password vs a future OAuth provider.
- **Expired access token during a request:** The API returns 401. The client interceptor uses the refresh token to get a new access token silently and retries the failed request once. If the refresh also fails (expired/revoked), the user is logged out and redirected to Login.
- **Multiple tabs open on web (simultaneous requests):** Token refresh calls should be deduplicated (use a single in-flight promise, not multiple parallel refresh requests).
- **Account deletion:** Immediately revokes all tokens. The user is logged out of all devices. All user data is deleted within the same request (no async background deletion).

### Implementation Notes
- Use `bcrypt` with salt rounds = 12 for password hashing.
- Access token payload: `{ sub: userId, email, iat, exp }`. Sign with RS256.
- Refresh token: 256-bit random value, `crypto.randomBytes(32).toString('hex')`. Store `SHA-256(token)` in DB.
- On native, store the access token in memory (Zustand) and the refresh token in Expo SecureStore. Never persist the access token to disk.
- On web, store the access token in memory (Zustand). The refresh token is in an HTTP-only cookie.

---

## Feature 9: Lists Management

### Description
Users can save names to persistent lists. Two system lists (Liked, Passed) are managed automatically by the swipe system. Users can create unlimited custom lists.

### Acceptance Criteria
- [ ] Two system lists are created automatically for every new account: "Liked" and "Passed."
- [ ] System lists cannot be renamed or deleted.
- [ ] The "Liked" list is automatically populated when a user swipes right or taps the Like button.
- [ ] The "Passed" list is automatically populated when a user swipes left or taps the Pass button.
- [ ] Users can create custom lists with any name up to 128 characters.
- [ ] Users can add any name to any list from the Name Detail view.
- [ ] Users can remove a name from a list by swiping the list item (native) or via a delete button.
- [ ] Users can reorder names within a list via drag-and-drop.
- [ ] Users can delete custom lists (with confirmation). The names in the list are not deleted from the app — only the list association is removed.
- [ ] A name can exist in multiple lists simultaneously.
- [ ] When a name is liked (via swipe), if it was previously passed, it is removed from the "Passed" list and added to "Liked." Vice versa.

### Edge Cases
- **Adding a name that's already in the list:** Idempotent — no error, no duplicate. Show a brief toast: "Already in {list name}."
- **Creating a list with the name "Liked" or "Passed":** Allowed (user's custom list, different from system lists). The system lists are identified by their `type` field, not their name.
- **Guest user tries to access Lists tab:** Show a prompt to create an account, explaining that lists require an account to persist. Provide "Sign Up" and "Log In" CTAs.
- **Very long list (500+ entries):** The list detail screen must handle this via paginated loading (`cursor` pagination from the API). Do not load all entries at once.
- **Drag-to-reorder on web:** Use a drag-and-drop library compatible with React Native Web (e.g., `react-native-draggable-flatlist` which supports web). Ensure keyboard users can reorder via accessible controls.

---

## Feature 10: Guest Mode & Account Migration

### Description
Users can use Browse and Swipe without creating an account. Their swipe history is saved locally. On account creation, local data is migrated.

### Acceptance Criteria
- [ ] App is fully usable (Browse + Swipe) without an account.
- [ ] Swipe decisions are stored locally for guest users (MMKV).
- [ ] Last name preference is stored locally for guest users.
- [ ] Guest gender preference is stored locally.
- [ ] After 10 swipes, a dismissible prompt appears: "Create an account to save your decisions."
- [ ] On registration, local swipe history is sent to the server as part of the registration payload.
- [ ] After migration, local storage is cleared.
- [ ] If a user logs into an existing account, local swipe history is merged: local decisions that don't conflict with server-side decisions are added; conflicts (same name decided differently) favor the server-side decision.
- [ ] Guest users cannot access the Lists tab — a sign-up prompt is shown instead.

### Edge Cases
- **Guest user has 500+ local swipes and then registers:** The registration API call sends up to 5000 swipes in `localHistory`. Above 5000, the oldest decisions are dropped (this is an extreme edge case).
- **App reinstall (guest):** Local data is lost. This is expected behavior. The account creation prompt is shown again from zero.
- **User logs into an existing account that has conflicting swipe data:** Server wins. The merged result may show some local decisions overridden. A brief toast: "X swipes merged into your account."
