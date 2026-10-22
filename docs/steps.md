# Tatakae — Delivery steps

Prerequisites: read `ARCHITECTURE.md` (same folder) and `docs/PRODUCT_SPEC.md`. Each step = one branch stacked on the previous one + one PR whose base is the previous branch (step-01 → `main`). Logical names are listed below; a prefix/suffix imposed on the agent (e.g. `cursor/step-03-profile-settings-xxxx`) is allowed.

Conventions that override this document (see `ARCHITECTURE.md` §11): routes live in `src/app/` (read every `app/…` path below as `src/app/…`); actual branch names are those requested by the owner (`step-01-scaffold`, `step-02-data-and-domain`, `step-03-shell-and-header`, …). The UI is in **English**: all UI strings live in `src/i18n/en.ts`.

## Shared definition of "done"

- `npm run typecheck`, `npm run lint`, `npm test` green; `npx expo-doctor` with no errors.
- The app starts (`npx expo start --web` at minimum) with no console error; 390×844 web screenshots attached to the PR for every step with UI.
- No hard-coded UI string outside `src/i18n/en.ts`; no product number outside `src/config/product.ts`.
- README updated: features actually available, what is simulated / untested.
- PR description: goals, checks performed (commands + result), known limitations.

| # | Branch | Base | Content |
|---|---|---|---|
| 01 | `step-01-scaffold` | `main` | project, tooling, theme, empty navigation |
| 02 | `step-02-data-core` | 01 | SQLite, migrations, time/goals/XP domain, config |
| 03 | `step-03-profile-settings` | 02 | onboarding, profile, settings, categories, real header, crystals |
| 04 | `step-04-quests` | 03 | tasks, habits, occurrences, Quests screen, habit detail |
| 05 | `step-05-focus-timer` | 04 | timer machine, atomic sessions, Focus screen, summary, recovery |
| 06 | `step-06-notifications` | 05 | session end, break end, habit reminders |
| 07 | `step-07-home` | 06 | calendar + scores, radar, by category, today's quests |
| 08 | `step-08-stats` | 07 | week/month stats, heatmap, history, manual entry/correction |
| 09 | `step-09-blocking` | 08 | blocking abstraction, UI, iOS/Android native modules, dev build |
| 10 | `step-10-polish-qa` | 09 | export/deletion, demo mode, accessibility, multi-size QA, delivery |

---

## step-01-scaffold

**Goals:** runnable Expo SDK 58 strict TypeScript project, quality tooling, navigation skeleton and visual background.

**Key files:** `package.json` (scripts `start`, `web`, `ios`, `android`, `typecheck`, `lint`, `test`), `app.json` (name "Tatakae", slug `tatakae`, scheme `tatakae`, `userInterfaceStyle: "dark"`, `web.output: "single"`, plugins `expo-router`, `expo-sqlite`), `tsconfig.json`, `metro.config.js` (wasm support + COOP/COEP headers for expo-sqlite web, per the expo-sqlite "Web setup" docs), `jest.config.js` (`preset: 'jest-expo'`, TZ `globalSetup`), `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, 4 empty screens, `src/ui/theme/tokens.ts`, `src/ui/components/{ScreenBackground,Panel,TabBar,AppHeader}.tsx` (header with fake data clearly named `placeholder`), `src/i18n/en.ts`, `assets/images/landscape.jpg`, `README.md`.

**Actions:**
- `npx create-expo-app@latest tatakae --template default@sdk-58` then `npm run reset-project`, delete the examples. If an SDK 57 scaffold already exists: `npx expo install expo@~58.0.17 --fix`.
- `npx expo install expo-sqlite expo-image expo-linear-gradient react-native-svg expo-crypto`; dev: `npx expo install jest-expo jest @types/jest @testing-library/react-native -- --save-dev`.
- Full `src/` tree (empty folders with `index.ts` if needed), `@/` alias.

**Acceptance criteria:**
- `npx expo start --web` shows the 4 tabs (Home, Quests, Stats, Profile) over the landscape, compact header visible on every tab, content immediately below the header (no empty band).
- `tsc --noEmit` 0 errors with `strict` + `noUncheckedIndexedAccess`.
- `npm test` runs at least one test and confirms `new Date(2026, 9, 25).getTimezoneOffset()` is consistent with Europe/Paris (proof of the test TZ).
- No `ImageBackground`, no `react-native/Libraries/*` import.

**Tests:** tokens smoke test (computed contrast of `text` vs `panel(0.9)` ≥ 4.5), TZ test.

**Risks:** SDK 58 template (create-expo-app defaults to SDK 57); expo-sqlite web config (wasm); Expo Go SDK 58 not yet in stores → no on-device testing without a dev build (note it in the README).

---

## step-02-data-core

**Goals:** reliable persistence and base pure domain.

**Key files:** `src/db/{SqlDb.ts,expoSqlDb.ts,migrate.ts,migrations/index.ts,migrations/001_init.ts,rows.ts}`, `src/db/repositories/{profile,categories,goals,xp,settings,appState}.ts`, `src/test/{sqliteNodeDb.ts,fakeClock.ts,factories.ts,globalSetup.ts}`, `src/config/product.ts`, `src/domain/{types.ts,time/localDate.ts,time/splitByDay.ts,goals.ts,xp.ts}`, `src/hooks/{useDb.ts,useQuery.ts,useToday.ts}`, `src/services/{clock.ts,ids.ts,dataEvents.ts}`, `app/_layout.tsx` (`SQLiteProvider` + `onInit=migrate` + `useSuspense`, loading and error screens).

**Acceptance criteria:**
- Schema from `ARCHITECTURE.md` §3.2 applied verbatim (tables, CHECKs, indexes); `PRAGMA user_version = 1`; crystal wallet created exactly once.
- `expoSqlDb.transaction` serializes writes (mutex) and uses `withExclusiveTransactionAsync` outside web.
- `useToday()` changes value at local midnight (timer until next midnight + `AppState` active).
- `product.ts` contains every assumption from `ARCHITECTURE.md` §8, each commented `PRODUCT ASSUMPTION`.
- devDependency `better-sqlite3` installed (`npm i -D better-sqlite3`), used only in `src/test`.

**Tests to write:**
- localDate: `addDays` across March/October 2026, `weekStart` (Sunday → previous Monday), `isoWeekday`.
- splitByDay: 23:40→00:20; 2026-03-29 01:30→03:30 = 3,600 s; 2026-10-25 01:30→03:30 = 10,800 s; Sunday→Monday; multiple intervals + leftover seconds (Σ days = floor(total)).
- goals: latest version ≤ date; before `start_local_date` → none; rest; a change "today" does not affect yesterday.
- xp: 59 s → 0, 60 s → 1, 25 min → 25; level thresholds (L1 0, L2 60, L3 180, L10 2,700); `levelFromXp` at boundaries.
- Migrations (better-sqlite3): 0 → 1; double run has no effect; CHECKs rejected (empty title, `weekdays_mask = 0`, `goal_min = 0`, two sessions with `active_slot = 1`, two open pauses).

**Risks:** behavior divergence between better-sqlite3 and expo-sqlite (stick to standard SQLite SQL, positional `?` parameters); forgetting `foreign_keys = ON`; `withExclusiveTransactionAsync` unavailable on web.

---

## step-03-profile-settings

**Goals:** first launch with empty real data, profile, settings, categories, header wired to real data, isolated crystals module.

**Key files:** `app/onboarding.tsx`, `app/(tabs)/profile.tsx`, `app/settings/{index,goals,categories,timer}.tsx`, `src/features/crystals/{wallet.ts,useCrystalBalance.ts,index.ts}`, `src/services/profileService.ts`, `src/domain/totals.ts` (initial version: DB segments, no active session), `src/hooks/useFocusTotals.ts`, `src/ui/components/{AppHeader,Avatar,Emblem,ProgressBar,SegmentedControl,Button}.tsx`. Install `expo-image-picker`, `expo-file-system`.

**Content:**
- Onboarding: nickname (1–24 chars), optional photo (copied into `documentDirectory`), daily goals prefilled from `PRODUCT.goals` (editable, rest per day), weekly goal (default = sum). Creates profile + goal versions `effective_from = today` + seed categories in one transaction. No session, task, XP or crystal.
- Settings > Goals: edit per weekday (minutes, "No goal" or "Rest"), weekly goal; note "Applies from today".
- Settings > Categories: create, rename, icon (closed list), color (palette), reorder, archive/restore; "Uncategorized" not editable.
- Settings > Session: default duration, short break (`PRODUCT.timer` presets).
- Profile: editable avatar, nickname, level, XP bar, crystals, totals (total focus, sessions, active days — 0 at start), access to settings.
- Header: nickname, level, crystal balance (`useCrystalBalance` → 0), Today / Week from `useFocusTotals`; avatar → Profile; stats → `/(tabs)/stats?period=week`.

**Acceptance criteria:**
- Fresh install → onboarding → Home: header "Lvl 1", crystals "0", "Today 0 min / 2 h", "Week 0 min / 11 h".
- Changing Thursday's goal today creates a new dated version; past versions stay intact (verifiable in the DB).
- The crystals module is imported only through `src/features/crystals/index.ts`; no earning rule, no shop.
- Header ≤ 95 pt outside the safe area at `fontScale` 1, no truncation issue with a 24-character nickname (ellipsis).

**Tests:** `profileService.completeOnboarding` (transaction: all or nothing), crystal balance = 0 then = Σ transactions inserted in test, active category name uniqueness (case-insensitive), `AppHeader` component (no goal → no "/").

**Risks:** gallery permissions (denied → default avatar); temporary photo URI (always copy); header too tall with large fonts (`maxFontSizeMultiplier`).

---

## step-04-quests

**Goals:** complete one-off tasks and habits, per-date occurrences, Quests screen.

**Key files:** `src/db/repositories/{tasks,habits}.ts`, `src/services/questService.ts`, `src/domain/{quests.ts,habits.ts}`, `app/(tabs)/quests.tsx`, `app/quest/new.tsx`, `app/quest/task/[id].tsx`, `app/quest/habit/[id].tsx`, `src/ui/components/{QuestRow,CollapsibleSection,EmptyState,Sheet,ConfirmDialog}.tsx`. Install `@react-native-community/datetimepicker` only if the in-house date picker is insufficient (prefer a simple picker: Today / Tomorrow / pick via an in-house calendar reusing `WeekCalendar`).

**Content:**
- Task: title (required, inline validation), category, optional date, priority (Low/Normal/High), status, completion date; complete/reopen; archive.
- Habit: title, category, days (chips M T W T F S S), optional HH:MM reminder (stored; scheduled in step 06), active/archived. Occurrence materialization (`ARCHITECTURE.md` §4.8); completing an occurrence does not touch the habit.
- Quests > Today: Priority mission (chosen via a "Set as mission" menu), Tasks (including overdue), Today's habits ("3/4 this week" computed), collapsible completed items, "Add a quest". Quests > All: open tasks (with/without date), active habits, archived collapsed.
- Habit detail: monthly completion calendar (states done/missed/planned/rest/absent with icon + text legend), current streak, editing, archiving.
- "Start" button on each quest: navigates to `/focus?taskId=` or `?occurrenceId=` (screen implemented in step 05; here a stub route showing the chosen quest).

**Acceptance criteria:**
- Creating a Mon/Tue/Fri habit → occurrences created for planned days from today to today + 14, only one per date even after 3 restarts.
- Removing Wednesday from the mask: future pending Wednesday occurrences deleted (if no linked session), past ones intact.
- A task stays open until explicitly completed; a task due yesterday and not done shows as "Overdue" today.
- Empty screen: real welcome message ("No quests for today. Add your first task or habit.") + button.
- Forms usable with the keyboard open (`KeyboardAvoidingView`/scroll), targets ≥ 44 pt.

**Tests:** `occurrenceDatesToEnsure` (created mid-week, archiving, full mask), mask change, `questsForDate` (today vs past vs future, overdue, completed), `habitCalendarState` (5 states), `INSERT OR IGNORE` idempotence, invalid mission cleared.

**Risks:** occurrence explosion (bounded horizon); FK sessions → occurrences on deletion (only delete future pending ones without a session); ISO weekday vs `Date.getDay()` offset.

---

## step-05-focus-timer

**Goals:** reliable sessions (core of the product). Highest testing priority.

**Key files:** `src/domain/timer/machine.ts`, `src/services/sessionService.ts`, `src/db/repositories/sessions.ts`, `src/hooks/{useActiveSession,useNow,useSingleFlight}.ts`, `src/ui/providers/SessionRuntime.tsx` (root provider: reconcile + heartbeat + `AppState`), `app/focus/index.tsx`, `app/session/[id]/summary.tsx`, `src/ui/components/TimerRing.tsx`, `src/domain/totals.ts` (add live active session). Install `expo-keep-awake` ("Keep screen on" option, default off), `expo-haptics` (end, completion).

**Content:**
- Preparation: quest (optional, prefilled when launched from a quest), category (prefilled from the quest, max 1, "Uncategorized" allowed), duration (presets + custom, default 25) or "Free stopwatch", blocking toggle (disabled, label "Distraction blocking is not available in this version" until step 09).
- Running: permanent header, mission, large timer (time remaining / elapsed in stopwatch mode), "25 min session", Pause/Resume, Finish (confirmation if countdown before deadline, optional reason), "Discard" visible only if focus < 1 min.
- Summary: minutes done, optional 1–5 rating ("Skip"), XP earned (read from `xp_transactions`), "Complete quest" (explicit), "5 min break", "New session". Short break: dedicated countdown screen, no automatic start.
- Recovery: reconcile on launch / foreground / tick (`ARCHITECTURE.md` §5); abnormal stopwatch dialog; `pendingSummarySessionId`.

**Acceptance criteria (verifiable in tests and manually):**
- 25 min session, app closed 40 min, reopened → session `completed`, `ended_at = deadline`, `focused_sec = 1500`, exactly 25 XP, summary shown.
- 3 min pause in the middle → actual end at start + 28 min, focus 1,500 s; the 3 min appear in no total.
- Double tap on "Finish" or two simultaneous calls → a single finalization, a single XP row.
- Starting a 2nd session while one is active → refused with a link to the running session.
- Stop at 12 min 40 s → `stopped`, 760 s kept, 12 XP, reason stored, no guilt-inducing message.
- Session 23:50 → 00:15: 10 min on D, 15 min on D+1; header "Today" restarts at 0 + live after midnight.
- Header "Today/Week" increases live during the session (same hook as everywhere else).
- Free stopwatch left open 6 h with the app closed → confirmation dialog before anything is recorded.

**Tests:** machine (all transitions, open pause, truncation at `planned_sec`, deadline with multiple pauses, reconcile 4 cases); service on better-sqlite3 with `fakeClock` (scenarios above, restart = new service instance, `Promise.all` double finalization, rollback on mid-way error → no partial data); optional rating (absence ≠ 0).

**Risks:** `setInterval` frozen in background (no impact: display derived from timestamps); system clock changed by the user (bound focused ≤ planned, ≥ 0); summary navigation triggered twice (guarded by `pendingSummarySessionId`).

---

## step-06-notifications

**Goals:** local notifications for session end, break end and habit reminders, never blocking the timer.

**Key files:** `src/services/notificationService.ts`, `src/db/repositories/notifications.ts`, `app/settings/notifications.tsx`, integration in `sessionService` (start/pause/resume/finish) and `questService` (habits). `npx expo install expo-notifications`; `app.json`: `expo-notifications` plugin, Android permission `SCHEDULE_EXACT_ALARM`.

**Acceptance criteria:**
- Permission requested on the first session start (not at app launch); denied → normal session, "Notifications disabled" shown in Settings with a link to system settings.
- `session-end` scheduled at the deadline, cancelled on pause, rescheduled on resume, cancelled on early finish; never two `session-end` (table `scheduled_notifications`).
- Habit reminders: one `WEEKLY` trigger per planned day; archive/edit → resync; cap 50 + warning.
- In the foreground, session end does not show a duplicate banner (handler).
- Web: no error (no-op service).
- README: "Notifications: tested on … / not tested on …" according to reality.

**Tests (mocked expo-notifications):** scheduling/cancellation per transition, ISO → expo weekday conversion (ISO Monday 1 → 2, ISO Sunday 7 → 1), idempotent resync, cap.

**Risks:** approximate delivery on Android without exact alarm (document it); Android 13+ permission requires a channel created before the request; iOS limit of 64.

---

## step-07-home

**Goals:** complete Home screen in the exact order of the spec.

**Key files:** `app/(tabs)/index.tsx`, `app/categories.tsx`, `src/domain/{scores.ts,radar.ts}`, `src/ui/components/{WeekCalendar,DayCell,RadarChart,RadarLegend,CategoryBars,QuestRow}.tsx`, `src/hooks/useResponsiveLayout.ts`.

**Content:**
- A. Header (already in place). B. `WeekCalendar` immediately below: Mon→Sun week, week navigation, today selected + outline, cell = weekday/date/score/color, 5 states (`ARCHITECTURE.md` §4.4). C. Two side-by-side panels "Current form" (14-day radar, independent of the selected date, "Last 14 days") and "By category" (selected day, top 3 + "See all", includes "Uncategorized", common scale); stacked on small screens / large fonts. D. "Today's quests" for the selected date (max 3 + "See all quests"), completion, launch, collapsible completed items, "Free session" button. No tile duplicating the footer.
- Tapping a radar axis: bubble with value + explanation; accessible text list.

**Acceptance criteria:**
- Selecting Tuesday changes only categories + quests; header and radar unchanged.
- Future days without score, rest "Rest", no goal "—", today "88 · in progress", past day without session "0" (orange).
- No value > 100 displayed; 99.6 displayed as "99".
- Radar with 2 ratings: Strength "Not enough data (2/3)", never 0.
- 360×640 and font ×1.3: stacked blocks, no overlap, readable labels.
- Empty state (new user): calendar with consistent "0"/"—", radar all "Not enough data", categories "No session this day", quests empty state + "Free session".

**Tests:** `dayCellState` (5 states, today boundary), `scoreBucket` (39.99/40/79.99/80/99.99/100), radar (each axis: nominal, insufficient, exclusions: stopwatch, corrected, discarded, today for Consistency, days without goal for Endurance), `DayCell` component (`accessibilityLabel`), `RadarChart` (insufficient axis not drawn).

**Risks:** performance (one query per period, not per cell); readability over the landscape (0.90 panels); radar too small at 360 pt.

---

## step-08-stats

**Goals:** complete statistics, history and clearly identified manual corrections.

**Key files:** `app/(tabs)/stats.tsx`, `app/sessions.tsx`, `app/session/new.tsx`, `app/session/[id]/edit.tsx`, `src/domain/stats.ts`, `src/services/sessionService.ts` (`createManual`, `correct`), `src/ui/components/{BarChart,Heatmap,StatTile}.tsx`.

**Content:** Week/Month + navigation; tiles Total focus / Sessions / Average duration; per-day histogram (solid background, goal line, future days empty); weekly goal (bar + %); breakdown "By category"; 18-week heatmap with text legend; last session + "History"; manual entry (date, start time, duration, category, quest) and correction (duration, category) with "Manual entry" / "Corrected" badges. URL params `period`, `anchor` (from the header).

**Acceptance criteria:**
- Totals identical to the header and Home for the same period (cross-test on the same dataset).
- A session spanning two weeks is split correctly into each week.
- Correction 25 → 20 min: stats updated, XP −5 (row `r1`), session excluded from Mental, audit in `session_corrections`, badge visible.
- Archived category: still shown in history and breakdown with "(archived)".
- Month without data: tiles "0 min", "0", "—"; empty histogram with a message.

**Tests:** stats (count by start day, average, month period, ISO week spanning two months), `correct` (XP invariant, recomputed segments), `createManual` (XP per `manualEntriesEarnXp`, `source='manual'`), heatmap states.

**Risks:** inconsistent definitions (count vs segments) — stick to `ARCHITECTURE.md` §4.9; manual entry overlapping another session (allowed but warn); entry in the future (forbidden).

---

## step-09-blocking

**Goals:** blocking split into interface / permissions / native implementations, honest about its real state.

**Key files:** `src/services/blocking/{types,index,unavailableProvider,iosProvider,androidProvider,blockingService}.ts`, `app/settings/blocking.tsx`, Focus integration, `modules/tatakae-blocking/{expo-module.config.json,index.ts,ios/*.swift,android/src/**/*.kt,plugin/withTatakaeBlocking.ts}`, `eas.json` (development profile with `developmentClient: true`). `npx expo install expo-dev-client expo-build-properties`.

**Work order:**
1. Interface + `unavailableProvider` + `blockingService` + UI (labels from `ARCHITECTURE.md` §7.3) + reconciliation → shippable and tested everywhere (web, future Expo Go).
2. Android module (UsageStats + `specialUse` foreground service + overlay + `<queries>` LAUNCHER): plain-language disclosure screen before opening system settings.
3. iOS module level 1 (`AuthorizationCenter .individual`, `FamilyActivityPicker`, `ManagedSettingsStore`) + config plugin entitlement/App Group. Level 2 (`DeviceActivityMonitor` extension) only if level 1 is verified on a device.

**Acceptance criteria:**
- Without a native module (web, Expo Go): toggle disabled, "Distraction blocking is not available in this version" + reason; no other part of the app affected.
- "Apps blocked" / "Blocking active" is only shown if `getNativeState().active === true` (component test + review).
- `apply` on start and resume, `release` on pause/finish/discard; after a hard close then reopen with no active session → `reconcile_release` logged.
- `npx expo prebuild --clean` succeeds; Android debug build (`npx expo run:android` or EAS) compiles if the environment allows; otherwise the README says so.
- README "Blocking" section: exact configuration (Apple dev/distribution entitlement, App Group, Play `specialUse` declaration, special permissions), "implemented / compiled / tested on device" matrix per platform, remaining tests.

**Tests:** `blockingService` with a fake provider (start/pause/resume/finish sequences, native failure → session continues, reconciliation), availability → label mapping.

**Risks:** Family Controls distribution entitlement subject to Apple approval (blocking for TestFlight); no native testing possible in a cloud VM; Android background activity launch restrictions (use `TYPE_APPLICATION_OVERLAY` overlay, not `startActivity`); SDK 58 / iOS 27 scene compatibility of third-party libs (prefer the local module); Play rejection if disclosure is insufficient.

---

## step-10-polish-qa

**Goals:** data features, explicit demo mode, accessibility, visual QA, documented delivery.

**Key files:** `app/settings/data.tsx`, `src/services/{exportService,resetService}.ts`, `src/services/demo/seedDemo.ts`, `README.md`, `docs/qa-checklist.md` (in the repo). `npx expo install expo-sharing`.

**Content:**
- JSON export (all tables + schema version + date) via `expo-file-system` + `expo-sharing`.
- Delete all data: double confirmation (type "DELETE"), cancels notifications, releases blocking, deletes the `.db` file + avatar, back to onboarding.
- Demo mode (**implemented early in step-08b-demo-data**, only the polish remains here): Settings > Data > "Demo mode"; switches to a generated `tatakae-demo.db` (3 weeks of sessions, quests, ratings, one session spanning midnight, one rest day); permanent "Demo mode" banner in the header; leaving = back to the intact real database.
- Accessibility: `accessibilityRole`/`Label`/`State` on all controls, reading order, `fontScale` up to 1.5 without overlap (scrolling), targets ≥ 44 pt.
- Full visual review against the art direction (`ARCHITECTURE.md` §10) and the mockup deviations listed at the top of `ARCHITECTURE.md`.

**Acceptance criteria:**
- QA checklist ticked with screenshots: 360×640, 390×844, 430×932 (web) + simulator/device if available; font ×1.3 and ×1.5; compact header, calendar immediately below, no overlap, contrast over the landscape, keyboard on forms.
- New user: no demo data visible outside demo mode (test).
- Export then inspection: valid JSON, all tables present.
- Final README: exact launch instructions (web, iOS/Android dev build), features actually available, remaining limitations and native dependencies, checks performed, location of assumptions (`src/config/product.ts`).

**Tests:** export (structure), reset (empty DB afterwards), `seedDemo` only on the demo DB (guard: refuses if `activeDb !== demo`), demo ↔ real switch without loss.

**Risks:** demo mode leaking into the real DB (service-level guard); closing/reopening the DB during an active session (forbid switching while a session is active).
