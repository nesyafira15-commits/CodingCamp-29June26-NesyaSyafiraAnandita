# Design Document: To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a self-contained, client-side single-page application (SPA) delivered as three static files: one HTML entry file, one CSS stylesheet, and one JavaScript module. No server, build toolchain, or external dependency is required — the application runs entirely in the browser and persists all state to `localStorage`.

The dashboard surfaces four functional widgets on a single viewport:

| Widget | Responsibility |
|---|---|
| Greeting Widget | Live clock, date, and time-based personalised greeting |
| Focus Timer | Configurable Pomodoro-style countdown with audible alert |
| To-Do List | Full task lifecycle — add, edit, complete, sort, delete |
| Quick Links | Saved URL launcher |

Supporting cross-cutting concerns: light/dark theme, custom user name, and a Settings Panel.

**Design goals**:
- Zero external requests — all assets are inline or local.
- Sub-100 ms UI responsiveness; sub-2 s initial paint.
- Graceful degradation when `localStorage` is unavailable.
- Plain Vanilla JS (ES2020+), no frameworks.

---

## Architecture

### High-Level Structure

```
index.html          ← markup skeleton, links stylesheet & script
style.css           ← all visual rules, CSS custom properties for theming
app.js              ← all application logic
```

### Module Organisation Inside `app.js`

The JavaScript file is organised into logically separated, self-contained sections. Each section owns a slice of state and exposes an `init()` function called from a top-level `DOMContentLoaded` bootstrap.

```
app.js
├── Storage          — thin wrapper around localStorage (get/set/remove + error handling)
├── Theme            — load/persist/toggle light-dark theme
├── GreetingWidget   — clock tick, greeting derivation, name display
├── FocusTimer       — countdown state machine, audio alert
├── TaskList         — task CRUD, sort, rendering
├── QuickLinks       — link CRUD, rendering
├── SettingsPanel    — settings overlay open/close, form validation, save dispatch
└── Bootstrap        — DOMContentLoaded → init all modules
```

### Data Flow

```
User Interaction
      │
      ▼
DOM Event Handler (in each Widget module)
      │
      ├── Validate input
      ├── Mutate in-memory state
      ├── Call Storage.set(key, data)   ─── localStorage
      └── Call render()                ─── update DOM
```

All state lives in module-scoped variables. There is no shared global mutable state. Modules communicate only through direct function calls (not events) to keep the dependency graph simple and auditable.

### Rendering Strategy

Each widget owns a dedicated `render()` function. Rendering is **full re-render of that widget's container** (innerHTML replacement) triggered after every state mutation. Given the small data volumes involved (< 100 tasks, < 50 links), this is fast enough to stay within the 100 ms constraint and avoids the complexity of diffing.

### Timer Implementation

The Focus Timer uses `setInterval` (1 000 ms tick) wrapped in a state machine with three states: `IDLE`, `RUNNING`, `PAUSED`. State transitions guard against double-starts and race conditions.

```
IDLE ──start──► RUNNING ──stop──► PAUSED ──start──► RUNNING
                    │                                    │
                  reset                               reset
                    ▼                                    ▼
                  IDLE                                 IDLE
RUNNING ──tick reaches 0──► IDLE  (with alert)
```

### Clock Implementation

`GreetingWidget` uses a single `setInterval` ticking every 500 ms (faster than 1 s to avoid visible drift) combined with `document.addEventListener('visibilitychange', ...)` to catch tab-restore events and immediately re-sync the display.

---

## Components and Interfaces

### Storage Module

```js
// Storage.get(key) → any | null
// Storage.set(key, value) → { ok: boolean, error?: string }
// Storage.remove(key) → void
```

- `get` parses JSON; returns `null` on missing key or parse failure, logs a warning.
- `set` serialises to JSON; catches `QuotaExceededError` and other exceptions; returns `{ ok: false, error }` on failure.
- All other modules check the return value of `set` and surface an error notification on failure.

**localStorage keys**:

| Key | Type | Default |
|---|---|---|
| `tld_theme` | `"light"` \| `"dark"` | OS preference |
| `tld_userName` | `string` | `""` |
| `tld_timerDuration` | `number` (minutes, 1–120) | `25` |
| `tld_tasks` | `Task[]` (JSON) | `[]` |
| `tld_sortOrder` | `SortOrder` string | `"creation"` |
| `tld_links` | `Link[]` (JSON) | `[]` |

### Theme Module

- On load: read `tld_theme`; if absent, read `window.matchMedia('(prefers-color-scheme: dark)')`.
- Apply by toggling `data-theme="dark"` attribute on `<html>`. All colour variables are declared under `:root` and `[data-theme="dark"]` selectors in CSS.
- Toggle handler updates attribute + persists to storage.
- If `localStorage` is unavailable, theme still toggles in-session via the attribute (no persistence).

### Greeting Widget

**Public interface**: `GreetingWidget.init()` — starts the clock interval and visibilitychange listener.

Internal logic:
- `tick()` — called every 500 ms. Reads `new Date()`, formats time (HH:MM:SS) and date (Weekday, DD Month YYYY using `Intl.DateTimeFormat`), derives greeting tier, composes greeting string, updates DOM.
- `getGreetingTier(hour)` — pure function mapping hour (0–23) to greeting string.
- `renderName(name)` — appends `, [Name]` if name is non-empty after trim; truncates to 50 chars.

**Greeting hour mapping**:

| Hour range | Greeting |
|---|---|
| 05–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–21 | Good Evening |
| 22–23, 00–04 | Good Night |

### Focus Timer

**State machine fields** (module-scoped):
```js
let timerState = 'IDLE';   // 'IDLE' | 'RUNNING' | 'PAUSED'
let intervalId = null;
let remainingSeconds = 0;
let configuredMinutes = 25;
```

**Public interface**: `FocusTimer.init()`, `FocusTimer.applyNewDuration(minutes)` (called by SettingsPanel).

**Audio alert**: Use the Web Audio API (`AudioContext`) to generate a short beep tone programmatically — no external audio file required, satisfying the zero-network-request constraint.

**Control states**:

| Timer state | Start enabled | Stop enabled | Reset enabled |
|---|---|---|---|
| IDLE | ✓ | ✗ | ✓ |
| RUNNING | ✗ | ✓ | ✓ |
| PAUSED | ✓ | ✗ | ✓ |
| Expired (IDLE, 0s) | ✓ | ✗ | ✓ |

### Task List

**Public interface**: `TaskList.init()` — loads from storage, renders.

**Internal operations** (all mutate `tasks[]` then call `Storage.set` then `render`):
- `addTask(description)` — validates (non-empty, non-duplicate), creates `Task`, appends.
- `editTask(id, newDescription)` — validates (non-empty, non-duplicate excluding self), updates.
- `toggleTask(id)` — flips `completed` boolean.
- `deleteTask(id)` — removes by `id`.
- `setSortOrder(order)` — updates `currentSortOrder`, persists, re-renders.
- `getSortedTasks()` — returns a sorted copy (does not mutate source array).

**Duplicate detection**: case-insensitive comparison of trimmed descriptions against all existing tasks (excluding self for edits).

**Sort implementation**: `getSortedTasks()` switches on `SortOrder` enum, returns a new sorted array leaving the source array unchanged.

### Quick Links

**Public interface**: `QuickLinks.init()`.

**Operations**:
- `addLink(label, url)` — validates label (non-empty, ≤100 chars) and URL (must start with `http://` or `https://`), creates `Link`, persists, renders.
- `deleteLink(id)` — shows `window.confirm()` prompt; on confirm removes, persists, renders; on cancel no-op.
- `openLink(url)` — `window.open(url, '_blank', 'noopener,noreferrer')`.

### Settings Panel

**Public interface**: `SettingsPanel.init()` — attaches open/close handlers.

**Responsibilities**:
- Render current saved values into form fields on open.
- Validate user name (≤50 chars after trim).
- Validate timer duration (integer, 1–120).
- On save: dispatch to `GreetingWidget.setName(name)` and `FocusTimer.applyNewDuration(minutes)`.
- Display per-field inline validation errors.

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string}  id          - UUID v4 generated at creation time
 * @property {string}  description - Trimmed, max 200 chars (500 chars for edits per spec)
 * @property {boolean} completed   - false on creation
 * @property {number}  createdAt   - Unix timestamp (ms) at creation time
 */
```

> Note: The requirements spec states max 200 chars when adding and max 500 chars when editing. The `description` field stores whichever limit applies at mutation time.

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id    - UUID v4 generated at creation time
 * @property {string} label - Non-empty, max 100 chars
 * @property {string} url   - Must start with http:// or https://
 */
```

### SortOrder

```js
/**
 * @typedef {'creation' | 'alpha-asc' | 'alpha-desc' | 'completed-last' | 'completed-first'} SortOrder
 */
```

### AppSettings (in-memory only, derived from localStorage on load)

```js
/**
 * @typedef {Object} AppSettings
 * @property {string} theme           - 'light' | 'dark'
 * @property {string} userName        - '' or trimmed string ≤50 chars
 * @property {number} timerDuration   - 1–120 (minutes)
 * @property {SortOrder} sortOrder
 */
```

### ID Generation

Because the app has no backend, IDs are generated client-side using `crypto.randomUUID()` (available in all target browsers at their latest stable versions). This avoids timestamp collision issues when adding multiple tasks rapidly.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Time formatter produces valid HH:MM:SS

*For any* `Date` object, the time formatting function shall produce a string of the form `HH:MM:SS` where HH ∈ [00,23], MM ∈ [00,59], and SS ∈ [00,59], correctly reflecting the hours, minutes, and seconds of the given date.

**Validates: Requirements 1.1**

---

### Property 2: Date formatter produces valid "Weekday, DD Month YYYY"

*For any* `Date` object, the date formatting function shall produce a string matching the pattern `<Weekday>, <DD> <Month> <YYYY>` with the correct values derived from the date.

**Validates: Requirements 1.2**

---

### Property 3: Greeting tier is correct for any hour of the day

*For any* integer hour value in [0, 23]:
- hours in [5, 11] → greeting is "Good Morning"
- hours in [12, 17] → greeting is "Good Afternoon"
- hours in [18, 21] → greeting is "Good Evening"
- hours in [22, 23] ∪ [0, 4] → greeting is "Good Night"

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 4: Greeting name composition — correct format and truncation

*For any* valid greeting string and any name string with trimmed length ∈ [1, 50], the composed greeting shall be `"<greeting>, <name>"` with exactly one comma-space separator between greeting and name, and the name portion shall not exceed 50 characters.

**Validates: Requirements 2.5**

---

### Property 5: Whitespace or empty names produce no suffix

*For any* string composed entirely of whitespace characters (including the empty string `""`), the greeting composition function shall return the bare greeting with no name suffix.

**Validates: Requirements 2.6, 3.4**

---

### Property 6: Name exceeding 50 characters is rejected by validation

*For any* string whose trimmed length is greater than 50 characters, the name validation function shall return a failure result (with an error message), and no save operation shall be performed.

**Validates: Requirements 2.7, 3.1**

---

### Property 7: Timer duration validation covers the full valid and invalid range

*For any* integer value `d`:
- if `d` ∈ [1, 120], duration validation shall succeed and the value shall be accepted
- if `d` < 1, `d` > 120, `d` is non-integer, or the input is empty/non-numeric, validation shall fail with an error message and the value shall be rejected without saving

**Validates: Requirements 5.1, 5.6**

---

### Property 8: Timer display formatter produces valid MM:SS for any remaining seconds

*For any* remaining time value in seconds corresponding to a configured duration in [1, 120] minutes (i.e., seconds ∈ [0, 7200]), the display formatter shall produce a string matching `MM:SS` where MM ∈ [00, 99] and SS ∈ [00, 59].

**Validates: Requirements 4.1**

---

### Property 9: Timer decrement is exact — N ticks reduce remaining by exactly N seconds

*For any* starting remaining-time value `T` (in seconds) and any positive integer `N` such that `T − N ≥ 0`, after `N` simulated timer ticks the remaining time shall equal exactly `T − N` seconds.

**Validates: Requirements 4.2**

---

### Property 10: Timer control states always match the state machine state

*For any* Focus Timer state (`IDLE`, `RUNNING`, or `PAUSED`), the enabled/disabled state of Start, Stop, and Reset controls shall exactly match the specification table:
- IDLE: Start=enabled, Stop=disabled, Reset=enabled
- RUNNING: Start=disabled, Stop=enabled, Reset=enabled
- PAUSED: Start=enabled, Stop=disabled, Reset=enabled

**Validates: Requirements 4.6, 4.7**

---

### Property 11: Sorting never mutates the source task array

*For any* task list and *for any* valid `SortOrder`, calling `getSortedTasks()` shall return a new array in the requested order and the original source array shall remain byte-for-byte unchanged (same length, same elements, same element order as before the call).

**Validates: Requirements 9.2**

---

### Property 12: Sort preference round-trip — saved order is restored from storage

*For any* valid `SortOrder` value, after `setSortOrder(order)` is called, reading `tld_sortOrder` from `localStorage` shall return a value that equals `order`, and the task list shall subsequently render in that order.

**Validates: Requirements 9.3, 9.4**

---

### Property 13: Add task round-trip — valid task is persisted and retrievable

*For any* non-whitespace, non-duplicate task description, after `addTask(description)` the task collection stored at `tld_tasks` shall contain exactly one new entry whose `description` equals `description.trim()` (max 200 chars), and the in-memory task list length shall be one greater than before.

**Validates: Requirements 6.2, 6.3, 10.2**

---

### Property 14: Whitespace-only task descriptions are always rejected

*For any* string composed entirely of whitespace characters (including empty string), calling `addTask(description)` shall not create a new task, the task list length shall remain unchanged, and a validation error message shall be surfaced.

**Validates: Requirements 6.5**

---

### Property 15: Duplicate task descriptions are rejected (case-insensitive)

*For any* existing task list containing at least one task, and *for any* candidate description that is equal to an existing task's description under case-insensitive comparison (after trimming), calling `addTask(candidate)` shall reject the addition, leave the task list unchanged, and surface a duplicate-task error message.

**Validates: Requirements 6.6**

---

### Property 16: Edit task round-trip — updated description is persisted

*For any* task in the task list and any valid (non-empty, non-duplicate) new description, after `editTask(id, newDescription)` the task stored at `tld_tasks` shall have `description` equal to `newDescription.trim()` (max 500 chars), and all other task fields shall remain unchanged.

**Validates: Requirements 7.3, 7.4**

---

### Property 17: Edit task rejects duplicates (excluding self, case-insensitive)

*For any* task list with at least two tasks, and *for any* edit that sets the target task's description to a value that case-insensitively matches any *other* task's description (after trimming), `editTask` shall reject the change, leave the task's original description intact in storage, and surface a duplicate-task error message.

**Validates: Requirements 7.6**

---

### Property 18: Completion toggle is a round-trip — double-toggle restores original state

*For any* task with *any* initial `completed` value, toggling it twice shall restore `completed` to its original value, and the storage representation shall reflect the original value after the second toggle.

**Validates: Requirements 8.2, 8.3**

---

### Property 19: Delete task removes exactly the target and decrements list length by one

*For any* task list and *for any* task `t` in that list, after `deleteTask(t.id)` the resulting list shall not contain any task with `id === t.id`, the list length shall be exactly one less than before, and all other tasks shall remain unmodified.

**Validates: Requirements 8.5**

---

### Property 20: Add link round-trip — valid link is persisted and retrievable

*For any* non-empty label of length ≤ 100 characters and any URL starting with `http://` or `https://`, after `addLink(label, url)` the link collection stored at `tld_links` shall contain exactly one new entry with the given label and URL, and the in-memory link list length shall be one greater than before.

**Validates: Requirements 11.2**

---

### Property 21: URL validation rejects non-HTTP(S) schemes

*For any* string that does not start with `http://` or `https://` (including empty string, FTP URLs, bare domain names, `javascript:` URIs, etc.), the URL validation function shall return a failure result with an error message.

**Validates: Requirements 11.5**

---

### Property 22: Theme toggle is a round-trip — double-toggle restores original theme

*For any* starting theme value (`"light"` or `"dark"`), activating the theme toggle twice shall restore the `data-theme` attribute on `<html>` to the original value, and `tld_theme` in `localStorage` shall equal the original theme.

**Validates: Requirements 13.2, 13.3**

---

## Error Handling

### localStorage Unavailability

If `localStorage` is unavailable (e.g., private browsing, security policy), the `Storage` module catches the `SecurityError` or `ReferenceError` on first access and sets an `isAvailable` flag to `false`. Subsequent `set` calls silently no-op; `get` calls return `null`. The application functions normally for the current session with in-memory state only. The theme toggle is still functional; the light theme is applied as default.

### Corrupted Storage Data

`Storage.get` wraps `JSON.parse` in a try/catch. On a parse failure it returns `null` and logs a warning. For task data specifically, `TaskList.init()` checks for a `null` response or non-array value and initialises with an empty collection, then renders a visible error notification: "Saved tasks could not be loaded."

### localStorage Write Failures

All write calls (`Storage.set`) capture exceptions and return `{ ok: false, error }`. Each widget checks this result immediately after any mutation. On failure:
- **TaskList**: reverts the in-memory state change and renders an error notification banner.
- **QuickLinks**: restores the deleted link to the in-memory array, re-renders, and shows a notification.

### Timer Edge Cases

- If `setInterval` fires late (e.g., due to browser throttling of background tabs), the timer simply resumes from its last in-memory `remainingSeconds`. There is no drift correction — the session may run longer than intended if the tab is backgrounded. This is an acceptable UX trade-off for the scope of this application.
- A `visibilitychange` handler re-syncs the clock display but does not adjust `remainingSeconds`.

### Input Validation Errors

All validation errors are shown inline, adjacent to the offending input field, using a `<span class="error-msg">` element. Errors are cleared on next successful submission or on input change.

---

## Testing Strategy

### PBT Applicability Assessment

This feature consists primarily of **pure functions** (formatters, validators, sort logic, string composition) and straightforward data mutation operations with in-memory state. Property-based testing is highly appropriate for the logic layer.

**PBT applies to**: time/date formatters, greeting tier mapping, name composition, duration and URL validation, sort non-mutation invariant, task/link CRUD round-trips, toggle round-trips, theme toggle round-trip.

**PBT does NOT apply to**: timer tick integration (DOM/interval), cross-browser rendering, performance benchmarks, `window.confirm` interactions, visibilitychange event handling. These are covered by example-based unit tests or manual smoke tests.

### Property-Based Testing Library

Use **[fast-check](https://fast-check.dev/)** for JavaScript property-based testing. It provides generators for strings, integers, arrays, tuples, and arbitrary records, which map cleanly to the data models here.

Configure each property test to run a minimum of **100 iterations**:
```js
fc.assert(fc.property(...), { numRuns: 100 });
```

Tag each test with a comment referencing the design property:
```js
// Feature: todo-life-dashboard, Property 3: Greeting tier is correct for any hour of the day
```

### Unit Tests (Example-Based)

Focus unit tests on:
- Timer state machine transitions (`IDLE → RUNNING → PAUSED → RUNNING → IDLE`)
- Timer expiry at 00:00 (notification rendered, audio triggered, controls updated)
- `visibilitychange` handler re-syncs clock display
- `window.confirm` cancel path for link deletion (no-op)
- OS dark-mode preference fallback when no theme is saved
- Corrupted localStorage data initialises empty task list with error notification
- localStorage unavailability: application loads and functions without throwing

### Integration / Smoke Tests (Manual)

The following are verified manually in each target browser (Chrome, Firefox, Edge, Safari):
- Full page load < 2 s on simulated 25 Mbps connection (DevTools network throttling)
- All UI interactions respond visibly < 100 ms
- Theme applied before first paint (no flash of wrong theme)
- No external network requests issued (DevTools Network tab)
- All widgets render and function correctly
- Audio alert fires on timer expiry

### Test File Structure

```
tests/
├── unit/
│   ├── storage.test.js
│   ├── theme.test.js
│   ├── greetingWidget.test.js
│   ├── focusTimer.test.js
│   ├── taskList.test.js
│   ├── quickLinks.test.js
│   └── settingsPanel.test.js
└── property/
    ├── formatters.property.test.js     (Properties 1, 2, 8)
    ├── greeting.property.test.js       (Properties 3, 4, 5, 6)
    ├── timerValidation.property.test.js (Properties 7, 9, 10)
    ├── taskCrud.property.test.js       (Properties 11–19)
    ├── quickLinks.property.test.js     (Properties 20, 21)
    └── theme.property.test.js          (Property 22)
```
