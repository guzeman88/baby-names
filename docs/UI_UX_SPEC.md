# UI/UX Specification
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Design Lead

---

## 1. Design Principles

1. **Data at a glance** — Every screen surfaces useful information without requiring the user to dig. Popularity context is always visible.
2. **Zero friction discovery** — The user should be able to pick up the app mid-thought and immediately be discovering names, with no required setup.
3. **Delight in motion** — Interactions feel physical and responsive. The swipe card metaphor is the emotional core; animations must reinforce the decision-making ritual.
4. **Calm, neutral palette** — Baby product aesthetic without being cloying. The UI should not compete with the names themselves.
5. **Consistency across platforms** — While native platform conventions are respected, the app should feel like the same product on iOS, Android, and Web.

---

## 2. Design Tokens

### 2.1 Color Palette

```
Primary Brand
  --color-primary:        #5B6AF0   (Indigo — primary actions, selected states)
  --color-primary-light:  #EEF0FD   (Background tint for selected items)
  --color-primary-dark:   #3D4DC4   (Pressed / active state)

Semantic
  --color-liked:          #34C759   (iOS green — swipe right, liked names)
  --color-liked-bg:       #E8F8EE   (Card overlay on right swipe)
  --color-passed:         #FF3B30   (iOS red — swipe left, passed names)
  --color-passed-bg:      #FEE9E8   (Card overlay on left swipe)

Gender
  --color-boy:            #3A8DDE   (Blue — boy indicator)
  --color-girl:           #E5708A   (Rose — girl indicator)
  --color-neutral:        #8E8E93   (Gray — used when both genders shown)

Neutral Scale
  --color-text-primary:   #1C1C1E   (Near-black)
  --color-text-secondary: #3C3C43   (Dark gray — labels, secondary info)
  --color-text-tertiary:  #8E8E93   (Light gray — hints, placeholders)
  --color-surface:        #FFFFFF   (Card backgrounds)
  --color-background:     #F2F2F7   (Screen background)
  --color-separator:      #C6C6C8   (List dividers)
  --color-border:         #E5E5EA   (Input borders, card borders)

Distribution Curve
  --color-curve-fill:     #5B6AF0   (In-range area fill)
  --color-curve-dimmed:   #E5E5EA   (Out-of-range area fill)
  --color-curve-stroke:   #3D4DC4   (Curve line)
```

### 2.2 Typography

```
Font Family:
  iOS / macOS:    System default (SF Pro)
  Android:        System default (Roboto)
  Web:            Inter (Google Fonts, loaded via @expo-google-fonts)

Type Scale:
  --text-name-hero:   40px / Semi-bold / -0.5px tracking   (Swipe card name)
  --text-name-large:  28px / Semi-bold / -0.3px tracking   (Detail view name)
  --text-title:       22px / Bold     / -0.3px tracking    (Screen title)
  --text-body-lg:     17px / Regular  / 0px tracking       (List item name)
  --text-body:        15px / Regular  / 0px tracking       (Body text, labels)
  --text-caption:     13px / Regular  / 0.1px tracking     (Secondary info, badges)
  --text-micro:       11px / Regular  / 0.2px tracking     (Slider tick labels)
```

### 2.3 Spacing System

8px base grid. All spacing values are multiples of 4px.

```
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px    (standard padding)
--space-5:  20px
--space-6:  24px    (section padding)
--space-8:  32px
--space-10: 40px
--space-12: 48px
```

### 2.4 Border Radius

```
--radius-sm:   8px    (small elements: badges, pills)
--radius-md:  12px    (inputs, list items)
--radius-lg:  16px    (cards, sheets)
--radius-xl:  24px    (name detail card)
--radius-full: 9999px (circular buttons, fully-rounded pills)
```

### 2.5 Shadows

```
--shadow-card:   0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
--shadow-modal:  0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)
--shadow-swipe:  0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)
```

---

## 3. Navigation Structure

```
Root Navigator (Tabs — always visible)
├── Browse Tab              (icon: list.bullet)
│   └── Browse Screen
│       └── Name Detail Screen (modal/push)
├── Swipe Tab               (icon: hand.draw)
│   └── Swipe Screen
├── Lists Tab               (icon: heart)
│   └── Lists Overview
│       └── List Detail Screen [listId]
└── Profile Tab             (icon: person.circle)
    ├── Settings Screen
    ├── Login Screen        (if not authenticated)
    └── Register Screen     (if not authenticated)
```

**Tab Bar (Mobile):**
- 4 tabs, icons + labels
- Active tab: `--color-primary`
- Inactive tab: `--color-text-tertiary`
- No badge indicators in v1.0

**Web Navigation:**
- On desktop web (viewport ≥ 768px): Left sidebar navigation replaces bottom tab bar
- On mobile web: Bottom tab bar identical to native

---

## 4. Screen Specifications

---

### 4.1 Browse Screen

#### Layout (Mobile)
```
┌─────────────────────────────┐
│  [< Back]  Browse   [⚙ Filter]  │  ← Navigation bar
├─────────────────────────────┤
│  ┌──────────────────────┐   │
│  │ 🔍 Search names...   │   │  ← Search/filter bar area
│  └──────────────────────┘   │
│  Gender: [Boy] [Girl] [Both] │  ← Segmented control
├─────────────────────────────┤
│  Popularity                  │
│  ●────────────────●         │  ← Two-ended slider
│  15th              85th      │
│                              │
│  [Distribution curve here]   │  ← 56px tall SVG curve
│                              │
│  1,247 names in range ↑      │  ← Count badge
├─────────────────────────────┤  ← Sticky header above list
│  A                           │
│  ┌──────────────────────┐   │
│  │ Aaliyah Johnson    ♀ │   │
│  │ 78th percentile      │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ Abigail Johnson    ♀ │   │
│  │ 94th percentile      │   │
│  └──────────────────────┘   │
│  ...                         │
│                     [A-Z] ▶  │  ← Right edge index scrubber
└─────────────────────────────┘
```

#### Filter Panel (Bottom Sheet — expands on filter tap)
The filter controls (gender selector, popularity slider, distribution curve) collapse into a compact top bar in the normal state. Tapping the filter icon opens a bottom sheet with the full controls expanded, including the distribution curve visualization.

**Compact state (always visible):**
- Gender segmented control (Boy / Girl / Both)
- Single-line summary: "Popularity: 15th – 85th · 1,247 names"

**Expanded bottom sheet:**
- Gender segmented control (same)
- Last Name input field: "Preview with last name: _______"
- Popularity slider (full width)
  - Left handle: shows selected min percentile
  - Right handle: shows selected max percentile
  - Track: colored between handles, gray outside
- Distribution curve (see Section 4.4)
- Reset Filters button

#### Name List Item Component
```
┌─────────────────────────────────────────────┐
│  Abigail Johnson                         ♀  │
│  94th percentile  ·  #8 in 2023             │
│                                        ›    │
└─────────────────────────────────────────────┘
```
- **Height:** 68px
- **Padding:** 16px horizontal, 12px vertical
- **Left content:** Name (body-lg, primary), last-name-appended if set; secondary row: percentile + recent rank
- **Right content:** Gender dot (blue/rose) + chevron
- **Tap target:** Full row

#### A–Z Index Scrubber (Mobile)
- Fixed to right edge of screen
- 26 letter labels, spaced to fill height
- Touch anywhere on scrubber, finger position maps to list position
- Visual feedback: active letter shown in floating bubble near center-right

---

### 4.2 Name Detail Screen

#### Layout
```
┌─────────────────────────────┐
│  [✕ Close]                   │  ← Dismiss button (modal) or ← Back (push)
│                              │
│  Abigail Johnson             │  ← Name (text-name-large)
│  ♀ Girl's name               │  ← Gender label
│                              │
│  ┌────────────────────────┐  │
│  │   Popularity Over Time │  │
│  │                        │  │
│  │   [Line chart: births  │  │
│  │    per year, 1924–2024]│  │
│  │                        │  │
│  │  Tap year to see rank  │  │
│  └────────────────────────┘  │
│                              │
│  ┌──────────┐ ┌──────────┐  │
│  │Peak Rank │ │'24 Rank  │  │
│  │   #1     │ │   #8     │  │
│  │ in 1947  │ │          │  │
│  └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐  │
│  │Percentile│ │All-Time  │  │
│  │  94th    │ │ 4.2M     │  │
│  └──────────┘ └──────────┘  │
│                              │
│  [💚 Like]       [✗ Pass]   │  ← Action buttons
│  [+ Add to List]            │
└─────────────────────────────┘
```

#### Trend Chart Specification
- **Library:** Victory Native XL
- **Chart type:** `VictoryLine` with `VictoryArea` fill for visual weight
- **X axis:** Years (every 10 years labeled; all years as data points)
- **Y axis:** Annual birth count (auto-scaled to data max; labeled at 0, 50%, 100%)
- **Interaction:** Pan/pinch to zoom on the chart area; tap on a data point shows a tooltip with `Year: XXXX | Births: XXXXX | Rank: #XX`
- **Styling:** Line color = gender color (`--color-boy` or `--color-girl`); area fill = translucent (20% opacity) version of same
- **Missing years:** SSA only reports years with ≥5 births. Missing years render as gaps (no interpolation)

---

### 4.3 Swipe Screen

#### Layout (Mobile)
```
┌─────────────────────────────┐
│  Swipe            [⚙ Filter] │  ← Nav bar
├─────────────────────────────┤
│                              │
│  843 names remaining         │  ← Count, top-center
│                              │
│       ┌──────────────┐       │
│       │              │       │  ← "Peeking" back card (slightly visible)
│  ┌────┤──────────────┤────┐  │
│  │    │              │    │  │
│  │    │   Abigail    │    │  ← Active card
│  │    │   Johnson    │    │
│  │    │              │    │
│  │    │   Girl  94th │    │
│  │    │   percentile │    │
│  │    │              │    │
│  └────┴──────────────┴────┘  │
│       └──────────────┘       │
│                              │
│  [✗ Pass]      [↩ Undo]  [💚 Like] │  ← Action buttons
│                              │
└─────────────────────────────┘
```

#### Swipe Card Component
- **Size:** 85% screen width, 55% screen height
- **Border radius:** `--radius-xl` (24px)
- **Shadow:** `--shadow-swipe`
- **Background:** White surface with a subtle gender-tinted top stripe (thin, 4px)
- **Content:**
  - Name (text-name-hero, 40px, centered, vertically balanced)
  - Last name (if set) below, slightly smaller (22px, lighter weight, `--color-text-secondary`)
  - Bottom area: gender pill + percentile pill side by side
  - Subtle decorative element: large faded initial letter behind the name (accessibility: aria-hidden)
- **Tap action:** Opens Name Detail modal (from Browse spec)

#### Swipe Overlay
As the user drags the card:
- **Dragging right:** Card tilts clockwise; green overlay fades in starting at ~30% drag threshold; "LIKE" stamp label appears in top-left corner
- **Dragging left:** Card tilts counter-clockwise; red overlay fades in; "PASS" stamp label appears in top-right corner
- **Release above threshold (>40% drag):** Card animates off-screen; next card animates in
- **Release below threshold:** Card springs back to center with a slight bounce

#### Action Buttons
- Three buttons in a row: Pass (✗, 52px circle, `--color-passed`), Undo (↩, 44px circle, gray), Like (💚, 52px circle, `--color-liked`)
- Tapping Like/Pass triggers same animation as a corresponding swipe
- Undo button: disabled (opacity 0.3) if no swipe to undo

#### Empty Deck State
When all names in the current deck have been swiped:
- Illustrated empty state in place of card stack
- Message: "You've seen all the names!"
- Two options:
  - "Adjust Filters" (primary button)
  - "Reset Swipe History" (text link)

---

### 4.4 Distribution Curve Component

This is a custom SVG visualization rendered beneath the popularity slider. It is one of the most distinctive UI elements of the app.

#### What it shows
A histogram / density curve showing how many names exist at each popularity percentile. Because name popularity follows a power law (a few extremely popular names, many rare ones), the curve has the following shape:
- **High spike at 0th–10th percentile:** Most names are rare (very few births per year). The vast majority of SSA names cluster here.
- **Gradual taper:** Fewer names exist as you move toward the 100th percentile.
- **Very flat at 80th–100th:** Only a handful of names occupy the top popularity ranks.

This is counter-intuitive to many users (they expect "popular" to mean "where most names are") so the curve is a teaching tool as much as a visual one.

#### Rendering Specification
```
Component: <DistributionCurve
  data={nameCountByPercentileBucket}   // array of 100 values (one per percentile bucket)
  minSelected={15}                      // slider left handle value
  maxSelected={85}                      // slider right handle value
  height={56}
  width={containerWidth}
/>
```

- **Data:** Pre-computed on the client from the full name list. Array of 100 integers, where `data[i]` = number of names whose percentile falls in bucket `i` (0–99).
- **Visualization:** SVG path (smooth bezier curve through histogram peaks). Area under the curve is filled.
- **Fill:** In-range portion (`minSelected` to `maxSelected`) filled with `--color-curve-fill` at 40% opacity. Out-of-range filled with `--color-curve-dimmed` at 40% opacity.
- **Stroke:** Single curve stroke `--color-curve-stroke`, 1.5px.
- **Vertical lines:** Two vertical dashed lines at `minSelected` and `maxSelected` positions.
- **Label:** Below curve center: "{X} names in range" in `--text-caption` style.
- **Animation:** The filled region transitions smoothly as handles move (300ms ease).
- **Interactivity:** None. The curve is display-only; the slider above it is the interactive element.

#### Example states

*Very wide range (0–100):* Entire curve filled blue, count = all names for gender.

*Narrow range, low percentile (0–20):* Left section filled (the tall spike), right mostly dimmed. Count = large (most names are rare).

*Narrow range, high percentile (80–100):* Only the flat right tail filled. Count = very small (e.g., "Top 47 names").

---

### 4.5 Lists Screen

#### Lists Overview
```
┌─────────────────────────────┐
│  My Lists              [+ New] │
├─────────────────────────────┤
│  ┌──────────────────────┐   │
│  │ 💚 Liked            43 │   │  ← System list (cannot delete)
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ ✗ Passed           128 │   │  ← System list (cannot delete)
│  └──────────────────────┘   │
│  ─────── My Lists ──────    │
│  ┌──────────────────────┐   │
│  │ ⭐ Top Contenders    8 │   │  ← User list
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ 📋 Middle Names      3 │   │  ← User list
│  └──────────────────────┘   │
└─────────────────────────────┘
```

#### List Detail Screen
- Header: List name (editable via tap on title for user lists)
- Sorted by: date added (default), or A–Z (toggle)
- Each list item: same component as Browse name item
- Swipe on item (iOS: native swipe; Android: long-press context menu) → Delete from list
- Tap item → Name Detail view
- For user-created lists: 3-dot menu → Rename, Delete list

---

### 4.6 Profile / Settings Screen

```
┌─────────────────────────────┐
│  Profile                     │
├─────────────────────────────┤
│  ○  Guest User              │  ← Avatar (initials if logged in)
│     [Sign In]  [Create Account] │
│                              │
│  ─── Preferences ──────     │
│  Last Name         Johnson ▶ │  ← Tap to edit
│  Default Gender    Both    ▶ │  ← Tap to cycle/select
│                              │
│  ─── Account ───────────    │  ← Only visible if logged in
│  Email             a@b.com  │
│  Change Password          ▶ │
│  Delete Account           ▶ │
│                              │
│  ─── App ───────────────    │
│  Reset Swipe History      ▶ │
│  About BabyName           ▶ │
└─────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Swipe Physics

The swipe gesture uses `react-native-gesture-handler` + `react-native-reanimated` with the following tuning:

| Parameter | Value |
|---|---|
| Snap threshold | 40% of screen width |
| Decision velocity threshold | 800 px/s (fast flick always counts as a swipe) |
| Max rotation | 15° at screen edge |
| Card exit animation | 250ms ease-out |
| New card enter animation | 200ms spring (stiffness 120, damping 15) |
| Undo animation | Card slides back in from exit direction, 300ms ease |

### 5.2 Skeleton Loading

All list items and cards show a skeleton loading state (animated shimmer) while data is being fetched. No loading spinners for list content.

### 5.3 Empty States

Every screen that can be empty has a designed empty state:
- **Liked list (empty):** "No names liked yet — start swiping or browsing!"
- **Passed list (empty):** "No names passed yet."
- **Browse (no results with current filter):** "No names match your current filters. Try widening your popularity range."
- **Swipe deck (empty):** "You've seen all the names in this filter! Adjust filters or reset history."

### 5.4 Error States

- Network error on name load: Inline error with "Retry" button. Previously cached data remains visible with a "Last updated X min ago" banner.
- Swipe sync failure: Toast notification "Swipe saved locally — will sync when connected."
- Auth errors: Inline form errors (not modals), specific messaging per field.

---

## 6. Platform-Specific Notes

### iOS
- Navigation bar uses large title style on Browse and Lists screens.
- Bottom sheet uses native `UISheetPresentationController` (via Expo/React Native bottomsheet library).
- Haptic feedback (`Haptics.impactAsync`) fires on swipe decision (medium impact for like, light for pass).

### Android
- Material You elevation and ripple effects on buttons.
- Navigation bar respects edge-to-edge display.
- Haptic feedback via `Vibration.vibrate([0, 50])` on swipe decisions.

### Web (Desktop ≥ 768px)
- Left sidebar navigation (replaces bottom tabs).
- Browse screen: two-column layout (filter panel on left, name list on right).
- Swipe screen: Card is centered in a constrained-width column (max 400px). Mouse drag gestures work via `react-native-gesture-handler` web support.
- Keyboard shortcuts: `→` for like, `←` for pass, `Z` for undo on swipe screen.

---

## 7. Accessibility Checklist

- [ ] All buttons have `accessibilityLabel` and `accessibilityRole="button"`
- [ ] Name list items have `accessibilityLabel` combining name + gender + percentile
- [ ] Swipe screen announces swipe result via `AccessibilityInfo.announceForAccessibility("Abigail liked")`
- [ ] Distribution curve SVG has `accessibilityLabel` describing range and count
- [ ] Trend chart has `accessibilityLabel` describing peak, min, max
- [ ] All focusable elements reachable via keyboard on web
- [ ] Color alone never used to convey information (gender uses icon + color + label)
- [ ] Minimum 44×44pt touch target for all interactive elements
- [ ] Contrast ratios verified for all text/background combinations
