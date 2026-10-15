# ❌ Mistakes Log — Carlton CRM Frontend

> Every bug, wrong approach, or bad pattern found and fixed must be logged here.
> **Before writing code**, scan this file for patterns relevant to your current task.
> If a logged mistake pattern is detected — apply the correct fix directly. No repeats.

---

## How to Use This File

- **Before coding**: Search by keyword (component name, library, pattern, API)
- **When a bug is fixed**: Add it immediately at the **top** of the correct category
- **Entry count**: Increment counter at the bottom each time

---

## 📋 Mistake Entry Template

```
### [SHORT TITLE]
- **Date**: YYYY-MM-DD
- **Category**: notifications | datetime | react-query | nextjs | typescript | tailwind | framer-motion | api | forms | components | general

**What happened**:
Description of the bug or wrong approach.

**Why it happened**:
Root cause.

**Fix**:
What was changed.

**Rule — Never do this again**:
> One-line rule stated clearly.

**Code**:
// ❌ Wrong
...
// ✅ Correct
...
```

---

## 🗂 Categories

---

## 🔔 Notifications & Browser APIs

### Reading a notice's type only from `data`
- **Date**: 2026-10-15
- **Category**: notifications

**What happened**:
The sidebar's new-leads count refreshed on `payload.data.type === "lead_assigned"`; the stored notices (`notify()`)
carry the type at the top, so a lead moved to someone for inactivity left their count stale until a refocus.

**Why it happened**:
Two shapes on one socket event: the older senders put the type in `data`, the stored ones at the top.

**Fix**:
`const type = payload?.type ?? payload?.data?.type` wherever the event is read (the bell already did).

**Rule — Never do this again**:
> Read a "notification" event's type from the top first, then `data`.

---

### A list replaced wholesale by a refetch that started before a socket push
- **Date**: 2026-10-15
- **Category**: notifications

**What happened**:
The bell replaced every stored notice with the server's list; a notice that arrived on the socket while that list was
in flight vanished until the next refetch.

**Fix**:
Keep a socket-arrived stored notice the list doesn't have when it is newer than the list's newest.

**Rule — Never do this again**:
> When merging a fetched list with pushed items, keep the pushed ones newer than the fetch.

### Android `new Notification()` Constructor Crash
- **Date**: 2026-04-01
- **Category**: notifications

**What happened**:
`TypeError: Illegal constructor` on Android Chrome when triggering reminder notifications. Desktop browsers worked fine, Android silently crashed.

**Why it happened**:
Android Chrome blocks the direct `new Notification()` constructor. It only allows notifications via `ServiceWorkerRegistration.showNotification()`.

**Fix**:
In `hooks/useReminderNotifications.ts`, replaced all `new Notification(title, options)` with:
```ts
const reg = await navigator.serviceWorker.ready
reg.showNotification(title, options)
```

**Rule — Never do this again**:
> Never call `new Notification()` directly — always route through `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))`.

**Code**:
```ts
// ❌ Wrong — crashes on Android Chrome
function fireBrowserNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon.png" })
  }
}

// ✅ Correct — works on all platforms
async function fireBrowserNotification(title: string, body: string) {
  if (Notification.permission !== "granted") return
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(title, { body, icon: "/icon.png" })
  } else {
    new Notification(title, { body }) // desktop fallback only
  }
}
```

---

## 🕐 Date / Time (IST)

### `toDatetimeLocal()` Using Browser Timezone Instead of IST
- **Date**: 2026-04-01
- **Category**: datetime

**What happened**:
Reminder times displayed with wrong hours on non-IST browsers (e.g. Vercel preview on UTC server, or users browsing from different timezone).

**Why it happened**:
`d.getHours()` returns hours in the **browser's local timezone**, not IST. On a UTC machine, IST times appear 5h30m off.

**Fix**:
Use `toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })` which always outputs a string in `YYYY-MM-DD HH:mm:ss` format in IST, regardless of browser timezone.

**Rule — Never do this again**:
> All `datetime-local` conversions MUST use `sv-SE` locale + `Asia/Kolkata` timeZone. Never use `getHours()`, `getDate()`, etc. for IST output.

**Code**:
```ts
// ❌ Wrong — browser-timezone dependent
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ✅ Correct — always IST
function toDatetimeLocal(iso: string): string {
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
    .slice(0, 16)
    .replace(" ", "T")
}
function nowIST(): string {
  return toDatetimeLocal(new Date().toISOString())
}
```

**Files fixed**: `components/leads/ReminderPanel.tsx`, `app/(dashboard)/reminders/page.tsx`

---

### `datetime-local` Input Parsed as UTC Instead of IST
- **Date**: 2026-04-01
- **Category**: datetime

**What happened**:
When saving a reminder, the time was stored 5 hours 30 minutes behind the intended IST time. E.g., user picks `10:00 AM IST`, stored as `04:30 UTC` (correct) but the parsing intermediate step was wrong and some paths stored `10:00 UTC` = `3:30 PM IST`.

**Why it happened**:
`new Date("2024-06-01T10:00")` — a datetime string without timezone is parsed as **UTC** in V8 (Chrome/Node). So `10:00` was treated as `10:00 UTC` = `15:30 IST`.

**Fix**:
Append `:00+05:30` to force IST parsing:
```ts
const pickedIST = new Date(`${remindAt}:00+05:30`)
```

**Rule — Never do this again**:
> All `datetime-local` string parsing must append `:00+05:30` to force IST timezone. Never pass a bare `datetime-local` value to `new Date()`.

**Code**:
```ts
// ❌ Wrong — parsed as UTC
const pickedDate = new Date(remindAt) // "2024-06-01T10:00" → UTC

// ✅ Correct — parsed as IST
const pickedDate = new Date(`${remindAt}:00+05:30`) // explicitly IST
```

**Files fixed**: `components/leads/ReminderPanel.tsx`, `app/(dashboard)/reminders/page.tsx`

---

### Time Display Missing IST Label
- **Date**: 2026-04-01
- **Category**: datetime

**What happened**:
Reminder times displayed without timezone label — users confused whether times were IST or UTC.

**Why it happened**:
`toLocaleString` was called without `timeZone: "Asia/Kolkata"` option, falling back to browser timezone.

**Fix**:
Added `timeZone: "Asia/Kolkata"` to all `toLocaleString` calls that display reminder times, and appended `" IST"` to the output string.

**Rule — Never do this again**:
> All time display for this CRM must use `timeZone: "Asia/Kolkata"` and append `" IST"` so users always see IST-labeled times.

**Code**:
```ts
// ❌ Wrong
function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { ... }) // no timezone
}

// ✅ Correct
function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) + " IST"
}
```

---

## 📦 Components

### A page leaning on another module's API
- **Date**: 2026-10-15
- **Category**: components

**What happened**:
Inactive Leads took its team filter from `GET /teams` (Leads box) and the Move dialog its people from `GET /users`
(Users box) — a role given only the Inactive Leads box got an empty filter and "Nobody matches". The dialog also
asked for users on every page load while closed.

**Fix**:
The page's own `GET /inactive-leads/teams` (view) and `/people` (edit); the dialog asks only while open on it.

**Rule — Never do this again**:
> A page opened by its own permission gets what it needs from its own endpoints; a closed dialog fetches nothing.

### A wide table switched to cards at `md` — too early beside the sidebar
- **Date**: 2026-10-15
- **Category**: tailwind

**What happened**:
The Inactive Leads page (from the Remote CRM) showed its 8-column table from 768 px — where this layout's sidebar
already takes its share, leaving the table about 560 px: names wrapped onto three and four lines.

**Why it happened**:
The breakpoint was chosen for the screen, not for the space the table actually gets.

**Fix**:
Cards below `lg`, the table from `lg` (`lg:hidden` / `hidden lg:block`).

**Rule — Never do this again**:
> Pick a table's breakpoint by the width it gets beside the sidebar — 6+ columns: cards below `lg`.

---

### A page bringing its own padding into the dashboard layout
- **Date**: 2026-10-15
- **Category**: tailwind

**What happened**:
The Remote CRM's pages pad themselves (`p-4 sm:p-6`); here the layout's `<main>` already has `p-6`, so a phone got
40 px gutters on each side.

**Why it happened**:
Copied from a CRM whose layout doesn't pad.

**Fix**:
The page's outer wrapper is `space-y-6` only, like every page here.

**Rule — Never do this again**:
> Pages in `(dashboard)` add no outer padding — `<main>` does it.

---

### A card on a page everyone can open, reading data only some may read
- **Date**: 2026-10-15
- **Category**: components

**What happened**:
The automation card went on the Settings page, which every signed-in person can open; its `GET /settings/app` needs
Settings view, so everyone else would have seen "Could not load the automation settings."

**Why it happened**:
The card assumed whoever sees the page may read what it shows.

**Fix**:
The card checks `hasPermission("settings", "view")` (after mount — the sign-in comes from localStorage), passes it as
the query's `enabled`, and renders nothing without it.

**Rule — Never do this again**:
> A card that reads a permission-guarded API checks that permission itself — the page it sits on may be open to all.

### Duplicate Delete Dialogs Across Modules
- **Date**: 2026-04-01
- **Category**: components

**What happened**:
6 separate delete dialog components existed (`DeleteLeadDialog`, `DeleteUserDialog`, `DeleteTeamDialog`, `DeleteRoleDialog`, `DeleteCourseDialog`) — all nearly identical. Bug fixed in one was not fixed in others.

**Why it happened**:
No global `ConfirmDialog` existed. Each developer built their own.

**Fix**:
Create `components/shared/ConfirmDialog.tsx` as the single global confirmation dialog. All delete dialogs should use it. Document in `componentsHistory.md`.

**Rule — Never do this again**:
> Before building any modal/dialog, check `componentsHistory.md`. If a `ConfirmDialog` or `ResponsiveModal` exists — use it, never build a new one from scratch.

---

## 🔄 React Query

### Fetching Data in `useEffect` Instead of React Query
- **Date**: 2026-04-01
- **Category**: react-query

**What happened**:
Some components fetched data directly inside `useEffect` with `axios`. Data was not cached, re-fetched on every mount, and loading/error states were manually managed.

**Why it happened**:
Component was written without checking existing hooks.

**Fix**:
Move all data fetching to React Query hooks in `/hooks/`. Use `useQuery` for reads, `useMutation` for writes.

**Rule — Never do this again**:
> Zero raw fetches in components. All server state through React Query hooks in `/hooks/`. No exceptions.

**Code**:
```tsx
// ❌ Wrong
const [leads, setLeads] = useState([])
useEffect(() => {
  axios.get("/leads").then(r => setLeads(r.data))
}, [])

// ✅ Correct
const { data: leads, isLoading, error } = useLeads(filters)
```

---

### Missing `onError` Toast in Mutations
- **Date**: 2026-04-01
- **Category**: react-query

**What happened**:
Mutations failed silently — no error message shown to the user.

**Why it happened**:
`useMutation` was called without an `onError` handler.

**Fix**:
Every `useMutation` must have both `onSuccess` (toast + invalidate) and `onError` (error toast).

**Rule — Never do this again**:
> Every mutation must have `onError: (err) => toast.error(err.response?.data?.message ?? err.message)`.

---

## 🎨 Tailwind CSS

### Raw Color Classes Breaking Dark Mode
- **Date**: 2026-04-01
- **Category**: tailwind

**What happened**:
Some components appeared white-on-white in dark mode because they used `bg-white` and `text-gray-900`.

**Why it happened**:
Raw Tailwind color classes don't invert in dark mode. Semantic tokens like `bg-card` do.

**Fix**:
Replace all raw color classes with semantic token equivalents.

**Rule — Never do this again**:
> Never use raw Tailwind colors (`bg-white`, `text-gray-900`, `border-gray-200`). Always use semantic tokens (`bg-card`, `text-foreground`, `border-border`).

**Code**:
```tsx
// ❌ Wrong
<div className="bg-white text-gray-900 border border-gray-200">

// ✅ Correct
<div className="bg-card text-card-foreground border border-border">
```

---

### Inline `style={}` Instead of Tailwind
- **Date**: 2026-04-01
- **Category**: tailwind

**What happened**:
Responsive breakpoints and dark mode didn't work on elements using inline styles.

**Why it happened**:
Convenience — quick inline style instead of finding the Tailwind class.

**Fix**:
Replace all `style={{ ... }}` with equivalent Tailwind utility classes.

**Rule — Never do this again**:
> Zero inline styles. All styling via Tailwind classes only.

---

## 🌐 General / Other

### The page's gate and the API's gate disagreeing
- **Date**: 2026-10-15
- **Category**: general

**What happened**:
The Remote CRM's Inactive Leads page opened only for the Super Admin, while its sidebar entry and its API go by the
"inactive-leads" permission — a role given the box saw the entry and then "Only a super admin can see inactive leads."

**Why it happened**:
The page was written before the module existed, and kept its own Super Admin check.

**Fix**:
The page uses `hasPermission("inactive-leads", "view")` to open and `"edit"` to tick and move — the same as the routes.

**Rule — Never do this again**:
> A page gates on the same module and action as the API it calls; the Super Admin passes `hasPermission` anyway.

### No Input Validation for Future Time on Reminder Form
- **Date**: 2026-04-01
- **Category**: forms

**What happened**:
Users could save reminders with past times, causing notifications to fire immediately on creation.

**Why it happened**:
No `min` attribute on `datetime-local` input, and no frontend validation.

**Fix**:
1. Added `min={nowIST()}` on `<input type="datetime-local">` — prevents past-time selection
2. Added `timeError` state with future-time check before save
3. Backend also validates future time (double safety)

**Rule — Never do this again**:
> All `datetime-local` inputs for future-event scheduling must have `min={nowIST()}` and a frontend validation check before submit.

---

## ➕ Adding a New Mistake

Copy the template at the top and place it at the **top** of the correct category section.

**Entry count**: 19
*(Increment every time you add a mistake)*

## [2026-10-15] The open leaderboard page — what the test round found (fixed before shipping)

- **A TV left on stayed on the old month after midnight on the 1st** — the month timer compared React's pending month
  with a variable it had already moved on. **Fix**: compare with the month that just ended, read first.
- **A figure flashed blue on stepping to another month** — the flash's scope was the month asked for, while the old
  month's rows were still on screen (`keepPreviousData`); and a flash cut short by a ranking switch stayed blue.
  **Fix**: the scope is the board on screen; a new scope clears the flash.
- **▲ / ▼ carried over to another month or ranking** for up to 8 s. **Fix**: a different board starts with none.
- **"Reconnecting" before the live line had ever connected.** **Fix**: Connecting / Live / Reconnecting.
- **The live line stayed down after the server dropped it** ("io server disconnect" isn't retried by socket.io).
  **Fix**: try again in 2 s, as `lib/socket.ts` does.

## [2026-10-15] The Activity page's Attendance — what the test round found (fixed before shipping)

- **A past day with no clock-out said "still in" and "09:58–now".** **Fix**: today "still in" / "now"; another day
  "no clock-out" / "no out".
- **The HRMS not linked read as "didn't answer", every row "Not in the HRMS", with server variable names.** **Fix**:
  "isn't linked yet" vs "didn't answer — why"; rows say "—" while the HRMS can't say.
- **People said "Clocked out" for someone who never clocked in, or on a day off.** **Fix**: "Not clocked in" / "Day off".
- **Small ones**: the person chip showed on the Attendance tab (which ignores it); an hours-a-day shift read
  "00:00–08:00"; times not in the shift's zone; a 403 on a team's tab offered "Try again"; a zone the browser doesn't
  know would have broken the table; the team tab's empty text spoke of a search it hasn't. All fixed.
- **Found by the Draw CRM's test round, the same code here**: the Activity tabs pushed a phone's page wider (they
  scroll now); a sign-out while viewing as someone recorded nothing for the admin (now the admin's token, by fetch
  with keepalive); an emptied time field and an idle limit longer than the working day reached the server; Settings
  offered to people who can't open it; a blank Attendance tab for members; the server's reason hidden. All fixed.

## [2026-10-15] Currency on the account — what the test rounds found (fixed before shipping)

- **A device's earlier choice was copied to whoever signed in next** — the "carry it over" save couldn't tell whose
  choice a shared computer held. **Fix**: the device remembers whose choice it holds; an older one is offered ("Keep it
  on your account?", per person, at up to three openings), never saved by itself; another person's goes back to USD.
- **Device clocks**: picks stamped with the device's time lost to — or beat — picks from devices whose clocks differed.
  **Fix**: a save sent at once is "now" by the server; one sent late says only how long ago it was made.
- **A late pick could still lose** — quick taps on a slow link whose last save failed (the tap before it, stamped on
  arrival, looked newer at the next open), and a pick whose device clock went back before it was sent counted as
  "now". **Fix**: the device remembers the account as it last saw it; a late pick goes as "now" when nothing changed
  meanwhile, with its age only when another device changed it, and as a year old when its clock went back.
- **A save could land on the next person's account** — someone on a slow link picked, then signed out (or began
  viewing as someone) before their queued save went; it went with the next sign-in (or, before one, with no sign-in at
  all, and its refusal reloaded the sign-in page). **Fix**: a queued save goes only while its person is still the one
  signed in (else it waits for their next visit), and a refused pick's "the newer one stands" is shown only to them.
- **Small ones**: an answer arriving after a pick overwrote it; a failed save was lost at the next open (now kept per
  person and sent later); quick taps could land out of order (one at a time now); redrawing remounted pages mid-edit
  (now only when the account's currency arrives, and not while typing); picks while viewing as someone changed the
  admin's own. All fixed.
