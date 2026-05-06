# Product Requirements Document (PRD)
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Product Manager

---

## 1. Overview

### 1.1 Problem Statement

Choosing a baby name is one of the most significant and personal decisions a new parent makes. Current tools are fragmented: static lists exist on parenting blogs, popularity charts exist on SSA.gov, and couple-coordination tools like Kinder exist in silos. No single product combines rich data-driven name discovery, interactive trend analysis, a fun engagement mechanism (swiping), and collaborative list management across all platforms.

### 1.2 Product Vision

BabyName is the definitive baby name research and discovery tool for expectant parents. It combines 100+ years of real U.S. Social Security Administration birth data with a polished mobile-first experience to help parents find names that feel right — whether they want something classic and timeless, currently trending, or beautifully rare.

### 1.3 Target Users

| Persona | Description |
|---|---|
| **The Researcher** | Wants detailed data, trends over time, and precise control over popularity filters. Likely uses Browse screen heavily. |
| **The Discoverer** | Doesn't know what they want yet. Wants to see names and react. Primarily uses Swipe screen. |
| **The Collaborator** | Using the app together with a partner. Wants to save accepted/rejected names and compare lists. |

### 1.4 Platform Targets

- iOS (iPhone and iPad)
- Android (phone and tablet)
- Web (responsive, desktop and mobile browser)

---

## 2. Goals & Success Metrics

### 2.1 Primary Goals

1. Provide every U.S. baby name in the SSA dataset (1924–present) with rich trend data.
2. Give users two distinct and complementary discovery modes: Browse and Swipe.
3. Enable account-based persistence so users can save and revisit name decisions.
4. Ensure a delightful, fast, and accessible experience across all three platforms.

### 2.2 Non-Goals (v1.0)

- International name databases (outside SSA U.S. data)
- Real-time collaborative partner syncing (planned for v1.1)
- Name meaning, origin, or etymology data (planned for v1.1)
- Social features (public sharing, community lists)
- Paid tiers or monetization

### 2.3 Success Metrics

| Metric | Target |
|---|---|
| D7 Retention | ≥ 35% |
| Average swipes per session | ≥ 25 |
| Names saved to lists per user | ≥ 10 |
| Browse filter usage rate | ≥ 60% of Browse sessions |
| Account creation conversion | ≥ 50% of users who swipe |
| App Store rating | ≥ 4.5 stars |

---

## 3. User Stories

### 3.1 Browse Screen

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| B-01 | User | See all names in alphabetical order in a scrollable list | I can browse systematically |
| B-02 | User | Enter my last name | I can see "Emma Johnson" style previews to judge flow |
| B-03 | User | Filter names by gender (Boy / Girl / Both) | I only see relevant names |
| B-04 | User | Set a popularity range with a two-ended slider | I can control how common or rare the names are |
| B-05 | User | See a distribution curve beneath the popularity slider | I understand where in the overall distribution my bounds fall |
| B-06 | User | See the count of names within my current filter selection | I know how many names I'm looking at |
| B-07 | User | Tap a name to see a trend chart | I can see how the name's popularity has changed over 100 years |
| B-08 | User | See recent rank and peak rank on the detail view | I get a quick summary of the name's data |
| B-09 | User | Save a name to a list directly from Browse | I don't have to switch screens to save |

### 3.2 Swipe Screen

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| S-01 | User | See a card with a name on it | I can evaluate it |
| S-02 | User | Swipe right to accept a name | It gets added to my "Liked" list |
| S-03 | User | Swipe left to reject a name | It gets added to my "Passed" list and won't show again in this session |
| S-04 | User | Tap a name card to see its trend detail | I can learn more before deciding |
| S-05 | User | Have names cycle in a random order | I don't get stuck in alphabetical fatigue |
| S-06 | User | See visual feedback (color, animation) when swiping | The interaction feels responsive and fun |
| S-07 | User | Apply gender and popularity filters to the swipe deck | I only swipe on names relevant to me |
| S-08 | User | See how many names remain in the current deck | I know my progress |
| S-09 | User | Undo my last swipe | I can reverse accidental swipes |

### 3.3 Accounts & Lists

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| A-01 | User | Create an account with email and password | My data persists across devices |
| A-02 | User | Log in with my credentials | I can access my saved data |
| A-03 | User | View all my liked names in a list | I can review my favorites |
| A-04 | User | View all my passed (rejected) names | I can reconsider or confirm rejections |
| A-05 | User | Create custom named lists | I can organize names (e.g., "Top Contenders", "Middle Name Ideas") |
| A-06 | User | Move names between lists | I can reorganize as my preferences change |
| A-07 | User | Delete names from a list | I can remove names I no longer want |
| A-08 | User | Set my preferred last name in my profile | The last name preview works everywhere |
| A-09 | User | Set my gender preference in my profile | It applies by default to both Browse and Swipe |

---

## 4. Feature Requirements

### 4.1 Browse Screen — Detailed Requirements

#### Alphabetical Name List
- All names from the SSA dataset visible in a single scrollable, indexed list (A–Z jump bar on the right edge on mobile).
- Each list item shows: **First Name**, **Last Name Preview** (if set), **Gender indicator**, **Popularity indicator** (subtle pill or badge).
- List must scroll smoothly with at minimum 10,000+ entries.
- Virtual/windowed rendering required (not all DOM nodes at once).

#### Last Name Input
- Persistent text field accessible from Browse screen header or filter panel.
- Updates all name displays in real time without requiring a submit action.
- Stored per user account; also stored locally for guest users.

#### Gender Filter
- Three states: **Boy**, **Girl**, **Both**.
- Implemented as a segmented control / tab selector.
- Changing filter instantly re-renders the list.

#### Popularity Percentile Slider
- **Type:** Two-ended range slider (min handle and max handle).
- **Range:** 0–100 (representing percentile of popularity among all names of that gender for a defined recent year window — default last 10 years of data).
- **Percentile definition:** 0th = least popular (most rare), 100th = most popular (most common). Names are ranked by total births in the reference window.
- **Display:** Shows the selected low and high percentile values numerically.
- **Default state:** Full range (0–100), all names shown.

#### Distribution Curve (below slider)
- A visual rendering of the name count density across the 100-percentile range.
- Because name popularity follows a power law (many rare names, few dominant names), the curve will be heavily right-skewed (most density at low percentiles).
- The region within the selected slider bounds is highlighted/filled; outside bounds are dimmed/grayed.
- Beneath the curve: "**X names in range**" counter that updates in real time.
- This is a static visualization (not interactive itself); it purely reflects the slider state.

#### Name Detail View (Tap on Name)
- Full-screen modal or push screen.
- Contains:
  - **Name** (large heading) with last name preview if set
  - **Gender label**
  - **Trend Chart:** Line graph of annual popularity rank or birth count per year, from the earliest SSA record through the most recent year available. X-axis = year, Y-axis = births that year (or rank).
  - **Stats Panel:**
    - Peak popularity year and rank
    - Most recent year rank
    - Popularity percentile (current)
    - Total recorded births (all time)
  - **Add to List button**
  - **Swipe decision buttons** (quick Like / Pass without leaving detail view)

### 4.2 Swipe Screen — Detailed Requirements

#### Card Deck
- Displays one card prominently (current), with the next card peeking behind it.
- Each card shows:
  - **Name** (large, centered)
  - **Stylized last name preview** (if set)
  - **Gender indicator**
  - **Subtle popularity context** (e.g., "Top 5%" or "Rare")
- Card has a press-and-hold or tap action to open the Name Detail View (same as Browse).

#### Swipe Mechanics
- **Swipe right or tap ✓ button:** Name goes to "Liked" list. Green overlay animation on card.
- **Swipe left or tap ✗ button:** Name goes to "Passed" list. Red overlay animation on card.
- **Undo button:** Reverses the last swipe decision. Only one undo level required.
- Cards animate off-screen in the direction of the swipe.
- The next card animates into position.

#### Deck Management
- Names are served in a randomized order, seeded fresh each time the user enters the Swipe screen.
- Names the user has already swiped on (Liked or Passed in any previous session) are excluded from the deck by default.
- Option in settings to "Reset Swipe History" to start fresh.
- When all names in the filtered deck have been swiped, a completion state is shown with options to reset filters or reset history.

#### Filters (Swipe Screen)
- Gender filter (same as Browse).
- Popularity percentile range (same slider, but no distribution curve needed here — simpler UI).
- Filters are accessible via a bottom sheet or filter icon.

### 4.3 Accounts & Lists — Detailed Requirements

#### Authentication
- Email + password registration and login.
- Password must meet minimum security requirements (8+ chars, 1 uppercase, 1 number).
- Email verification on registration.
- Password reset via email.
- Sessions persist via secure token storage.

#### Guest Mode
- Users can use Browse and Swipe without creating an account.
- Swipe decisions are stored locally on device.
- A prompt to create an account is shown at natural points (after first 10 swipes, on app re-open if swipe history exists locally).
- On account creation, local swipe history is merged into the new account.

#### Lists
- Default lists created automatically for every user: **Liked**, **Passed**.
- Users can create additional custom lists with any name they choose.
- A name can belong to multiple lists.
- Lists support ordering (user can drag-reorder entries).

#### Profile Settings
- **Last name** text field (synced across devices when logged in).
- **Gender preference** (default filter for Browse and Swipe).
- **Notification preferences** (reserved for future features).
- **Account management:** Change email, change password, delete account (with confirmation).

---

## 5. Data Requirements

### 5.1 SSA Name Data

- Source: U.S. Social Security Administration — [https://www.ssa.gov/oact/babynames/limits.html](https://www.ssa.gov/oact/babynames/limits.html)
- Contains national data by year from 1880 to present.
- Each entry: `name`, `sex`, `count` per year.
- Only names with ≥ 5 occurrences in a given year are included by the SSA.
- The full dataset contains approximately 100,000+ unique name/gender combinations.
- This data is downloaded once and ingested into the application database during the data pipeline phase. It is refreshed annually when the SSA publishes new data.

### 5.2 Popularity Calculation

- Popularity percentile for each name is computed based on a configurable reference window (default: most recent 10 years).
- Rank is determined by total births within the reference window, per gender.
- Percentile = `(rank / total_names_for_gender) * 100`, inverted so 100 = most popular.

### 5.3 Data Freshness

- SSA releases updated data annually (typically April/May).
- The data pipeline should be runnable to update the dataset with a single command.
- Downstream computed metrics (percentiles, rankings) are recomputed after each ingestion.

---

## 6. Accessibility Requirements

- All interactive elements must have accessible labels.
- Minimum contrast ratio: 4.5:1 (WCAG AA).
- The swipe gestures must have button alternatives (✓ and ✗ buttons always visible).
- Font sizes must respect system accessibility font-size settings.
- VoiceOver (iOS) and TalkBack (Android) must announce name cards and swipe results.

---

## 7. Performance Requirements

| Requirement | Target |
|---|---|
| Browse list initial render | < 300ms |
| Filter application | < 150ms (no network call) |
| Swipe card transition | 60fps |
| Name detail view load | < 500ms |
| API response time (p95) | < 400ms |
| Offline mode | Browse and Swipe work with cached data |

---

## 8. Out of Scope for v1.0

- Partner/couple sync (matching accepted names between two accounts)
- Name meanings and etymology
- International / non-SSA name databases
- Push notifications
- Social sharing
- AI-based name recommendations
- Pronunciation audio
