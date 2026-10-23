# Tatakae — agent navigation (read this first)

Short map so agents **do not** load full `PRODUCT_SPEC.md` or `ARCHITECTURE.md` unless the task needs them. Open **only the sections** listed below.

Expo SDK 58 · Router in `src/app/` · Offline SQLite · UI strings in `src/i18n/en.ts` · Product numbers in `src/config/product.ts`.

## Layers (top → bottom)

| Layer | Path | Role |
|--------|------|------|
| Screens | `src/app/` | Expo Router routes only; no SQL |
| UI | `src/ui/` | Components, theme (`ui/theme/tokens.ts`), focus views |
| Hooks | `src/hooks/` | `useStats`, `useFocusTotals`, `useHome`, `useQuery` + topics |
| Services | `src/services/` | Orchestration, `Clock`, `dataEvents`, demo, notifications |
| Repositories | `src/db/repositories/` | SQL via `SqlDb`; `scope.ts` for stats filter |
| Domain | `src/domain/` | Pure logic + tests; no RN/Expo/DB imports |
| Config | `src/config/` | `product.ts` (HYPOTHÈSE PRODUIT), keys |

Data flow for reads: screen/hook → service or repository → domain helpers. Writes: service → `db.transaction` → repositories.

## Task → code (start here)

| Task | Primary files |
|------|----------------|
| Quests list / filters | `src/app/(tabs)/quests.tsx`, `src/domain/quests.ts`, `src/services/questService.ts` |
| New quest / habit form | `src/app/quest/new.tsx`, `src/ui/components/HabitStyleFields.tsx`, `questService.ts` |
| Habit detail / edit | `src/app/quest/habit/[id].tsx`, `src/db/repositories/habits.ts`, `src/domain/habits.ts`, `habitStyle.ts` |
| Task detail | `src/app/quest/task/[id].tsx`, `src/db/repositories/tasks.ts` |
| Home / calendar / radar | `src/app/(tabs)/index.tsx`, `useHome.ts`, `domain/scores.ts`, `radar.ts`, `WeekCalendar.tsx`, `RadarChart.tsx` |
| Stats / scope / heatmap | `src/app/(tabs)/stats.tsx`, `useStats.ts`, `domain/stats.ts`, `repositories/stats.ts`, `scope.ts`, `Heatmap.tsx` |
| Session history | `src/app/sessions.tsx`, `listSessionHistory` in `repositories/stats.ts` |
| Manual / edit session | `src/app/session/new.tsx`, `session/[id]/edit.tsx`, `sessionService.ts`, `domain/sessionEdit.ts` |
| Focus / timer | `src/app/focus/`, `ui/focus/*`, `domain/timer/machine.ts`, `SessionRuntime.tsx`, `sessionService.ts` |
| Goals / header totals | `useFocusTotals.ts`, `useHeaderData.ts`, `domain/goals.ts`, `domain/totals.ts`, `goalService.ts` |
| Notifications | `notificationService.ts`, `domain/notifications.ts`, `services/notifications/` |
| Demo data | `settings/data.tsx`, `services/demo/seedDemo.ts`, `domain/demoData.ts` |
| Profile / onboarding | `onboarding.tsx`, `profileService.ts`, `settings/*` |
| DB schema / migrate | `src/db/migrations/`, `migrate.ts`, `ARCHITECTURE.md` §3 |
| Blocking (planned) | `ARCHITECTURE.md` §7; UI copy in `en.ts`; no fake native success |

## Task → doc sections (not whole files)

| Task | `PRODUCT_SPEC.md` | `ARCHITECTURE.md` |
|------|-------------------|-------------------|
| Habits / daily quests | §8 | §4.8, §3.2 (habits tables) |
| Tasks / missions | §8 | §4.8 |
| Pomodoro / timer reliability | §9 | §5 |
| Stats / goals in UI | §11 | §4.9, §4.3 |
| Radar / scores | §7, §6 | §4.4, §4.5 |
| XP / profile | §12 | §4.7 |
| Notifications | (product §9 timer context) | §6 |
| Blocking | §10 | §7 |
| Visual / tokens | §4 | §10, `src/ui/theme/tokens.ts` |
| Implementation gaps | — | §11 |
| New migration | — | §3.3 (additive only) |

## Commands

```bash
npm run check                    # tsc + lint + jest (required before done)
npm test -- path/to/test.ts      # targeted tests
npx expo install <package>       # Expo/native deps only
```

Expo docs (SDK 58): https://docs.expo.dev/versions/v58.0.0/

## Agent discipline (saves tokens)

- Search (`Grep`) for symbols before reading whole files.
- Do not read `PRODUCT_SPEC.md` / `ARCHITECTURE.md` end-to-end; use the tables above.
- No browser, canvas, or extra docs unless the user asks.
- Minimal diff; no README/architecture edits unless requested.

Non-negotiable rules live in `.cursor/rules/tatakae.mdc` (always applied).
