# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a self-contained, client-side single-page dashboard delivered as three static files (`index.html`, `style.css`, `app.js`). The plan follows the module structure defined in the design: Storage → Theme → GreetingWidget → FocusTimer → TaskList → QuickLinks → SettingsPanel → Bootstrap wiring. Property-based tests use **fast-check**; unit tests use a standard JS test runner (Vitest or Jest).

---

## Tasks

- [ ] 1. Scaffold project structure and testing framework
  - Create `index.html` with semantic HTML skeleton, linking `style.css` and `app.js`
  - Create empty `style.css` and `app.js` stubs so the page loads without errors
  - Initialise `package.json` and install **Vitest** and **fast-check** as dev dependencies
  - Create `tests/unit/` and `tests/property/` directory structure with placeholder test files
  - _Requirements: 14.1_

- [ ] 2. Implement the Storage module
  - [~] 2.1 Write the Storage module in `app.js`
    - Implement `Storage.get(key)` — reads, JSON-parses, returns `null` on missing key or parse failure, logs a warning
    - Implement `Storage.set(key, value)` — JSON-serialises, catches `QuotaExceededError` and `SecurityError`, returns `{ ok, error? }`
    - Implement `Storage.remove(key)`
    - Detect `localStorage` unavailability on first access; set `isAvailable` flag; make `set` a silent no-op and `get` return `null` when unavailable
    - _Requirements: 10.2, 10.4, 13.6_

  - [ ]* 2.2 Write unit tests for the Storage module
    - Test `get` with missing key, valid JSON, malformed JSON
    - Test `set` success, quota failure, unavailable storage
    - Test `isAvailable` flag behaviour
    - _Requirements: 10.4, 13.6_

- [ ] 3. Implement the Theme module and CSS theming foundation
  - [~] 3.1 Write CSS custom properties for light and dark themes in `style.css`
    - Declare all colour tokens under `:root` (light theme defaults)
    - Override tokens under `[data-theme="dark"]` on `<html>`
    - _Requirements: 13.1, 13.2_

  - [~] 3.2 Write the Theme module in `app.js`
    - On load: read `tld_theme` from storage; if absent, check `window.matchMedia('(prefers-color-scheme: dark)')` and apply accordingly
    - Apply theme by toggling `data-theme="dark"` attribute on `<html>` before first paint
    - Implement toggle handler: flip attribute + persist `tld_theme` to storage
    - If `localStorage` unavailable, toggle still works in-session without persisting
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 3.3 Write property test for theme toggle round-trip (Property 22)
    - **Property 22: Theme toggle is a round-trip — double-toggle restores original theme**
    - **Validates: Requirements 13.2, 13.3**
    - File: `tests/property/theme.property.test.js`

  - [ ]* 3.4 Write unit tests for the Theme module
    - Test OS dark-mode preference fallback when no theme is saved
    - Test theme applied before first paint (attribute set synchronously)
    - Test `localStorage` unavailability: toggle functions without throwing
    - _Requirements: 13.4, 13.5, 13.6_

- [ ] 4. Implement the Greeting Widget
  - [~] 4.1 Implement time and date formatting pure functions
    - `formatTime(date)` → `HH:MM:SS` string using local timezone
    - `formatDate(date)` → `"Weekday, DD Month YYYY"` string using `Intl.DateTimeFormat`
    - _Requirements: 1.1, 1.2_

  - [ ]* 4.2 Write property tests for time and date formatters (Properties 1, 2)
    - **Property 1: Time formatter produces valid HH:MM:SS**
    - **Property 2: Date formatter produces valid "Weekday, DD Month YYYY"**
    - **Validates: Requirements 1.1, 1.2**
    - File: `tests/property/formatters.property.test.js`

  - [~] 4.3 Implement `getGreetingTier(hour)` pure function
    - Map hour 0–23 to "Good Morning" / "Good Afternoon" / "Good Evening" / "Good Night" per specification
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.4 Write property test for greeting tier mapping (Property 3)
    - **Property 3: Greeting tier is correct for any hour of the day**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - File: `tests/property/greeting.property.test.js`

  - [~] 4.5 Implement greeting name composition function
    - `composeGreeting(tier, name)` → appends `, [name]` if trimmed name is non-empty and ≤ 50 chars; returns bare greeting otherwise
    - _Requirements: 2.5, 2.6_

  - [ ]* 4.6 Write property tests for greeting name composition and whitespace handling (Properties 4, 5)
    - **Property 4: Greeting name composition — correct format and truncation**
    - **Property 5: Whitespace or empty names produce no suffix**
    - **Validates: Requirements 2.5, 2.6, 3.4**
    - File: `tests/property/greeting.property.test.js`

  - [~] 4.7 Implement `GreetingWidget.init()` and `tick()` in `app.js`
    - Start `setInterval` ticking every 500 ms, calling `tick()` to update DOM
    - Attach `document.addEventListener('visibilitychange', ...)` to immediately re-sync on tab restore
    - Read saved user name from `tld_userName` on init; expose `GreetingWidget.setName(name)` for SettingsPanel
    - _Requirements: 1.1, 1.2, 1.3, 2.1–2.6, 3.3_

  - [ ]* 4.8 Write unit tests for the Greeting Widget
    - Test `visibilitychange` handler re-syncs clock display
    - Test `setName` updates greeting immediately
    - _Requirements: 1.3, 3.3_

- [~] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement the Focus Timer
  - [~] 6.1 Implement timer duration validation pure function
    - `validateDuration(input)` → accepts integer 1–120; returns `{ ok: true, value }` or `{ ok: false, error }`
    - _Requirements: 5.1, 5.6_

  - [ ]* 6.2 Write property test for timer duration validation (Property 7)
    - **Property 7: Timer duration validation covers the full valid and invalid range**
    - **Validates: Requirements 5.1, 5.6**
    - File: `tests/property/timerValidation.property.test.js`

  - [~] 6.3 Implement timer display formatter pure function
    - `formatTimer(seconds)` → `MM:SS` string; MM ∈ [00, 99], SS ∈ [00, 59]
    - _Requirements: 4.1_

  - [ ]* 6.4 Write property test for timer display formatter (Property 8)
    - **Property 8: Timer display formatter produces valid MM:SS for any remaining seconds**
    - **Validates: Requirements 4.1**
    - File: `tests/property/timerValidation.property.test.js`

  - [~] 6.5 Implement the Focus Timer state machine and controls in `app.js`
    - Module-scoped state: `timerState`, `intervalId`, `remainingSeconds`, `configuredMinutes`
    - Implement `start()`, `stop()`, `reset()` with proper IDLE/RUNNING/PAUSED transitions
    - On each tick decrement `remainingSeconds`; when it reaches 0 → transition to IDLE, freeze display, fire in-page notification, play Web Audio API beep, update control states
    - On expiry: disable Stop, enable Start and Reset
    - Expose `FocusTimer.applyNewDuration(minutes)` — stops active session, updates config, resets display, persists to `tld_timerDuration`
    - Load `tld_timerDuration` on init; default to 25 if absent
    - _Requirements: 4.1–4.7, 5.2–5.5, 5.7_

  - [ ]* 6.6 Write property tests for timer tick decrement and control states (Properties 9, 10)
    - **Property 9: Timer decrement is exact — N ticks reduce remaining by exactly N seconds**
    - **Property 10: Timer control states always match the state machine state**
    - **Validates: Requirements 4.2, 4.6, 4.7**
    - File: `tests/property/timerValidation.property.test.js`

  - [ ]* 6.7 Write unit tests for the Focus Timer
    - Test state machine transitions: IDLE → RUNNING → PAUSED → RUNNING → IDLE
    - Test timer expiry: notification rendered, audio triggered, controls updated
    - Test `applyNewDuration` stops active session and resets correctly
    - _Requirements: 4.2–4.7, 5.2, 5.7_

- [ ] 7. Implement the Task List
  - [~] 7.1 Implement task validation and CRUD pure functions
    - `validateTaskDescription(input, existingTasks, excludeId?)` — trims, checks non-empty and non-duplicate (case-insensitive); returns `{ ok, error? }`
    - `createTask(description)` — returns a new `Task` object with `crypto.randomUUID()`, `createdAt`, `completed: false`
    - `getSortedTasks(tasks, sortOrder)` — pure function returning a sorted copy, source array unchanged
    - _Requirements: 6.2, 6.5, 6.6, 7.3, 7.5, 7.6, 9.1, 9.2_

  - [ ]* 7.2 Write property tests for task CRUD and sort invariants (Properties 11–19)
    - **Property 11: Sorting never mutates the source task array**
    - **Property 13: Add task round-trip — valid task is persisted and retrievable**
    - **Property 14: Whitespace-only task descriptions are always rejected**
    - **Property 15: Duplicate task descriptions are rejected (case-insensitive)**
    - **Property 16: Edit task round-trip — updated description is persisted**
    - **Property 17: Edit task rejects duplicates (excluding self, case-insensitive)**
    - **Property 18: Completion toggle is a round-trip — double-toggle restores original state**
    - **Property 19: Delete task removes exactly the target and decrements list length by one**
    - **Validates: Requirements 6.2, 6.5, 6.6, 7.3, 7.6, 8.2, 8.3, 8.5, 9.2**
    - File: `tests/property/taskCrud.property.test.js`

  - [~] 7.3 Implement `TaskList` module in `app.js`
    - `TaskList.init()` — loads `tld_tasks` from storage, handles `null`/non-array/corrupted data with empty-state error notification; loads `tld_sortOrder`; renders
    - `addTask(description)` — validate → create → append → `Storage.set` → `render`; revert + notify on write failure
    - `editTask(id, newDescription)` — validate → update → `Storage.set` → `render`; revert + notify on write failure
    - `toggleTask(id)` — flip → `Storage.set` → `render`; revert + notify on write failure
    - `deleteTask(id)` — remove → `Storage.set` → `render`; revert + notify on write failure
    - `setSortOrder(order)` — update + persist `tld_sortOrder` → `render`
    - `render()` — full re-render of task list container; show empty-state message when list is empty
    - Wire Add control (button click and Enter key on input), Edit/Save/Cancel/Delete controls, and sort selector
    - _Requirements: 6.1–6.6, 7.1–7.7, 8.1–8.6, 9.1–9.4, 10.1–10.4_

  - [ ]* 7.4 Write unit tests for the Task List module
    - Test corrupted localStorage data initialises empty task list with error notification
    - Test localStorage write failure reverts state and shows notification
    - Test empty-state message renders when task list is empty
    - Test Enter key submits new task
    - _Requirements: 10.3, 10.4, 7.7, 8.6_

- [~] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Quick Links
  - [~] 9.1 Implement URL and label validation pure functions
    - `validateUrl(input)` — must start with `http://` or `https://`; returns `{ ok, error? }`
    - `validateLabel(input)` — non-empty, ≤ 100 chars; returns `{ ok, error? }`
    - _Requirements: 11.1, 11.5_

  - [ ]* 9.2 Write property tests for Quick Links round-trip and URL validation (Properties 20, 21)
    - **Property 20: Add link round-trip — valid link is persisted and retrievable**
    - **Property 21: URL validation rejects non-HTTP(S) schemes**
    - **Validates: Requirements 11.2, 11.5**
    - File: `tests/property/quickLinks.property.test.js`

  - [~] 9.3 Implement `QuickLinks` module in `app.js`
    - `QuickLinks.init()` — loads `tld_links` from storage; renders
    - `addLink(label, url)` — validate both fields, show per-field inline errors; on valid: create `Link` with `crypto.randomUUID()` → persist → render; clear error messages on successful resubmit
    - `deleteLink(id)` — show `window.confirm()` prompt; on confirm: remove → persist → render; on confirm+write failure: restore link + notify; on cancel: no-op
    - `openLink(url)` — `window.open(url, '_blank', 'noopener,noreferrer')`
    - `render()` — full re-render of links container
    - _Requirements: 11.1–11.5, 12.1–12.3_

  - [ ]* 9.4 Write unit tests for Quick Links
    - Test `window.confirm` cancel path for link deletion (no-op)
    - Test `localStorage` write failure on delete restores link
    - Test per-field validation error messages cleared on successful resubmit
    - _Requirements: 12.2, 12.3, 11.5_

- [ ] 10. Implement the Settings Panel
  - [~] 10.1 Add Settings Panel HTML structure and CSS in `index.html` / `style.css`
    - Markup for overlay/panel with fields: user name input (max 50 chars) and timer duration input (1–120)
    - Inline `<span class="error-msg">` elements adjacent to each field
    - Open/close control (always visible in header)
    - _Requirements: 2.7, 3.1, 5.1, 14.1_

  - [~] 10.2 Implement `SettingsPanel` module in `app.js`
    - `SettingsPanel.init()` — attach open/close handlers; populate fields from storage on open
    - Name field validation: trim → if length > 50 show inline error and reject save; if trimmed empty save `""`
    - Duration field validation: delegate to `validateDuration()`; show inline error and reject on failure
    - On successful save: persist `tld_userName` via `Storage.set`; call `GreetingWidget.setName(name)`; persist `tld_timerDuration` via `Storage.set`; call `FocusTimer.applyNewDuration(minutes)`
    - _Requirements: 2.7, 3.1–3.4, 5.1–5.3, 5.6_

  - [ ]* 10.3 Write property test for name length validation (Property 6)
    - **Property 6: Name exceeding 50 characters is rejected by validation**
    - **Validates: Requirements 2.7, 3.1**
    - File: `tests/property/greeting.property.test.js`

  - [ ]* 10.4 Write unit tests for the Settings Panel
    - Test save dispatches to GreetingWidget and FocusTimer correctly
    - Test invalid name shows inline error and does not save
    - Test invalid duration shows inline error and does not save
    - Test clear name field saves empty string and removes greeting suffix
    - _Requirements: 2.7, 3.1, 3.4, 5.6_

- [ ] 11. Implement Bootstrap, full HTML markup, and CSS layout
  - [~] 11.1 Complete `index.html` markup for all widgets
    - Add Greeting Widget section (time, date, greeting text)
    - Add Focus Timer section (display, Start/Stop/Reset buttons)
    - Add Task List section (input + Add button, sort selector, list container)
    - Add Quick Links section (label + URL inputs + Add button, links container)
    - Add theme toggle button in header (always visible)
    - Ensure no external network requests (no CDN links, no remote fonts)
    - _Requirements: 1.1, 4.1–4.7, 6.1, 9.1, 13.1, 14.1, 14.4_

  - [~] 11.2 Implement `Bootstrap` in `app.js` — `DOMContentLoaded` initialiser
    - Apply theme synchronously before paint (call `Theme.init()` first)
    - Then call `Storage`, `GreetingWidget`, `FocusTimer`, `TaskList`, `QuickLinks`, `SettingsPanel` init functions in order
    - _Requirements: 13.4, 14.2, 14.3_

  - [~] 11.3 Complete CSS layout and responsive styles in `style.css`
    - Grid or flexbox layout for four widget panels on a single viewport
    - Style all controls, inputs, error messages, notifications, and empty-state messages
    - Ensure all UI interactions produce visible state change within 100 ms (CSS transitions acceptable)
    - _Requirements: 14.2, 14.3, 14.5_

- [ ] 12. Wire sort preference and task list display to match Property 12
  - [~] 12.1 Implement sort preference persistence and restore in `TaskList`
    - Ensure `setSortOrder` persists `tld_sortOrder` and `TaskList.init()` reads it back; default to `"creation"` if absent
    - _Requirements: 9.3, 9.4_

  - [ ]* 12.2 Write property test for sort preference round-trip (Property 12)
    - **Property 12: Sort preference round-trip — saved order is restored from storage**
    - **Validates: Requirements 9.3, 9.4**
    - File: `tests/property/taskCrud.property.test.js`

- [~] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for full traceability
- Property-based tests use **fast-check** with a minimum of 100 iterations per property; each test must include a comment referencing the design property number
- Unit tests use **Vitest** (or Jest) and cover state machine transitions, edge cases, and error-recovery paths
- Checkpoints at tasks 5, 8, and 13 ensure incremental validation
- The project produces exactly three files (`index.html`, `style.css`, `app.js`) — no build output is required for production; the test tooling is dev-only

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "4.5"] },
    { "id": 5, "tasks": ["4.6", "4.7"] },
    { "id": 6, "tasks": ["4.8", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["6.4", "6.5"] },
    { "id": 9, "tasks": ["6.6", "6.7", "7.1"] },
    { "id": 10, "tasks": ["7.2", "7.3"] },
    { "id": 11, "tasks": ["7.4", "9.1"] },
    { "id": 12, "tasks": ["9.2", "9.3"] },
    { "id": 13, "tasks": ["9.4", "10.1"] },
    { "id": 14, "tasks": ["10.2"] },
    { "id": 15, "tasks": ["10.3", "10.4", "11.1"] },
    { "id": 16, "tasks": ["11.2", "11.3"] },
    { "id": 17, "tasks": ["12.1"] },
    { "id": 18, "tasks": ["12.2"] }
  ]
}
```
