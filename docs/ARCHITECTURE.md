# Tatakae — Architecture (plan d'implémentation)

> Copie du plan d'architecture. Les écarts constatés à l'implémentation sont listés en section 11 (ajoutée au dépôt) ; en cas de conflit, la section 11 prime.

Référence produit unique : `docs/PRODUCT_SPEC.md`. Maquettes (`internal/refs/01..04`) = intention visuelle seulement ; 05 « Temps d'écran » exclu. Ce document fixe les décisions ; `steps.md` fixe l'ordre de livraison. Interface en français, code/types/noms SQL en anglais.

Écarts des maquettes à NE PAS reproduire : score « 105 » (plafond 100) ; jours futurs affichés « 0 » (doivent être sans score) ; « + 10 cristaux si terminée » (aucune règle de cristaux) ; « Applications bloquées » + logos Instagram/TikTok/YouTube (interdit sans état natif confirmé, et pas de logos tiers) ; « Répartition par projet » (→ « Par catégorie ») ; avatar de type personnage existant (→ emblème original).

---

## 1. Stack et versions (vérifié le 2026-10-22 sur docs.expo.dev et npm)

| Élément | Version | Source |
|---|---|---|
| Expo SDK | **58** (`expo@~58.0.17`, sorti le 2026-10-15) | expo.dev/changelog/sdk-58 |
| React Native / React | 0.88.0 / 19.3.0 | table « SDK ↔ RN » des docs |
| Node.js (outillage) | ≥ 22.13 (lignes paires uniquement) | changelog SDK 58 |
| iOS min / Xcode | iOS 16.4+ / Xcode 26.4+ | docs versions |
| Android | 7+, compileSdk 37, targetSdk 36 | docs versions |
| expo-router | ~58.0.25 | `bundledNativeModules.json` d'expo@58.0.17 |
| expo-sqlite | ~58.0.13 | idem |
| expo-notifications | ~58.1.6 | idem |
| expo-image / expo-image-picker | ~58.0.16 / ~58.0.10 | idem |
| expo-file-system / expo-sharing | ~58.0.10 / ~58.0.20 | idem |
| expo-crypto (UUID) | ~58.0.7 | idem |
| expo-linear-gradient / expo-haptics / expo-keep-awake | ~58.0.3 / ~58.0.7 / ~58.0.3 | idem |
| expo-dev-client / expo-build-properties | ~58.0.14 / ~58.0.11 | idem (étape 09) |
| react-native-svg (radar, graphes, anneau) | 15.16.0 | idem |
| react-native-reanimated / worklets | 4.7.1 / 0.13.0 | déjà dans le template default |
| react-native-safe-area-context / screens | ~5.10.1 / ~4.30.0 | idem |
| @expo/vector-icons | ^15.0.2 | idem |
| jest-expo (+ jest, @testing-library/react-native) | ~58.0.12 | idem |
| better-sqlite3 (devDependency, tests DB Node uniquement) | dernière stable | npm |

Règles :
- Toujours installer via `npx expo install <pkg>` (jamais `npm i` direct pour un module natif). `npx expo-doctor` doit passer.
- Création : `npx create-expo-app@latest tatakae --template default@sdk-58` (sans `--template`, create-expo-app crée encore un projet SDK 57 pendant la transition). Puis `npm run reset-project` et suppression des exemples.
- **Expo Go** : le Expo Go SDK 58 des stores sort « dans quelques semaines ». D'ici là, tester sur appareil = **development build** (`npx expo run:ios|android` local, ou `eas build --profile development`). Le web (`npx expo start --web`) sert d'aperçu rapide pour les agents cloud (pas de notifications ni de blocage sur web). Si le scaffold existant est déjà en SDK 57, ne pas bloquer : `npx expo install expo@~58.0.17 --fix` à l'étape 01.
- Ruptures SDK 58 à respecter : API TypeScript stricte de RN 0.87+ (pas d'import profond `react-native/Libraries/*`, refs typées `ViewInstance`…) ; `ImageBackground` déprécié → `View` + `expo-image` en position absolue ; `InteractionManager` supprimé ; Expo Router : ne pas importer `expo-router/react-navigation` ; `web.output` défaut `"server"` → fixer `"single"` ou `"static"` dans `app.json` (aucune route serveur) ; `expo-notifications` affiche par défaut en premier plan → définir `setNotificationHandler`.
- Pas de bibliothèque de graphes, pas de lib d'état global, pas de lib de dates, pas de lib UI : composants maison sur primitives RN + `react-native-svg`. Une seule famille d'icônes (`MaterialCommunityIcons`).
- `tsconfig.json` : `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": false`, alias `@/*` → `src/*`.

---

## 2. Structure des dossiers

```
app/                                  # Expo Router (routes uniquement, logique minimale)
  _layout.tsx                         # providers: SafeArea, DbProvider, DataEvents, SessionRuntime; ScreenBackground + AppHeader + <Stack>
  onboarding.tsx                      # pseudo, photo, objectifs (affiché si pas de profil)
  (tabs)/_layout.tsx                  # <Tabs tabBar={TabBar}> Accueil, Quêtes, Stats, Profil
  (tabs)/index.tsx                    # Accueil
  (tabs)/quests.tsx                   # Quêtes (Aujourd'hui | Toutes)
  (tabs)/stats.tsx                    # Statistiques (?period=week|month&anchor=YYYY-MM-DD)
  (tabs)/profile.tsx                  # Profil + accès réglages
  focus/index.tsx                     # préparation + session en cours (+ pause courte)
  session/[id]/summary.tsx            # bilan après session
  session/[id]/edit.tsx               # correction manuelle
  session/new.tsx                     # saisie manuelle
  sessions.tsx                        # historique complet
  quest/new.tsx                       # ?kind=task|habit
  quest/task/[id].tsx                 # édition tâche
  quest/habit/[id].tsx                # fiche habitude + calendrier de réalisation + édition
  categories.tsx                      # « Voir tout » répartition du jour (?date=)
  settings/index.tsx, goals.tsx, categories.tsx, timer.tsx, notifications.tsx, blocking.tsx, data.tsx
src/
  config/product.ts                   # HYPOTHÈSES PRODUIT (unique fichier, §8)
  domain/                             # 100 % pur, zéro import RN/Expo/DB, testé à 100 %
    time/localDate.ts                 # LocalDate 'YYYY-MM-DD', addDays, isoWeekday, weekStart, monthRange, startOfLocalDay(ms)
    time/splitByDay.ts                # intervalles → secondes par jour local (minuit/DST)
    goals.ts                          # résolution des objectifs datés
    scores.ts                         # score quotidien, état de cellule, bucket couleur
    radar.ts                          # 4 axes + données insuffisantes
    totals.ts                         # agrégations uniques (jour, semaine, mois, catégories)
    xp.ts                             # XP par session, niveau, progression
    timer/machine.ts                  # états, transitions, focusIntervals, deadline, reconcile
    quests.ts                         # sélection des quêtes d'une date, tri, mission
    habits.ts                         # occurrences à matérialiser, états du calendrier d'habitude
    stats.ts                          # KPIs, histogramme, heatmap
    types.ts                          # types métier partagés
  db/
    SqlDb.ts                          # interface minimale (run/get/all/exec/transaction)
    expoSqlDb.ts                      # adaptateur expo-sqlite (+ mutex d'écriture)
    migrations/index.ts, 001_init.ts  # migrations versionnées (PRAGMA user_version)
    migrate.ts
    repositories/{profile,categories,tasks,habits,sessions,goals,xp,settings,appState,notifications}.ts
    rows.ts                           # mapping row ↔ type métier
  services/                           # orchestrent domaine + DB + modules natifs
    clock.ts, ids.ts, dataEvents.ts   # Clock injectable, newId(), bus d'invalidation
    profileService.ts                 # onboarding (transaction), profil, avatar
    sessionService.ts                 # start/pause/resume/finish/discard/reconcile (transactions)
    questService.ts                   # valider tâche/occurrence, matérialiser occurrences
    notificationService.ts
    blocking/{types.ts,index.ts,unavailableProvider.ts,iosProvider.ts,androidProvider.ts,blockingService.ts}
    exportService.ts, resetService.ts
    demo/seedDemo.ts                  # uniquement en mode démo (base séparée)
  features/crystals/                  # ISOLÉ : wallet.ts (repo+service), useCrystalBalance.ts, index.ts
  hooks/ useDb.ts, useQuery.ts, useToday.ts, useNow.ts, useActiveSession.ts, useFocusTotals.ts, useSingleFlight.ts, useResponsiveLayout.ts
  ui/
    providers/SessionRuntime.tsx      # reconcile + heartbeat + AppState (monté dans app/_layout.tsx)
    theme/tokens.ts, theme/typography.ts
    components/ ScreenBackground, AppHeader, TabBar, Panel, Button, IconButton, ProgressBar, SegmentedControl,
                WeekCalendar, DayCell, RadarChart, RadarLegend, CategoryBars, QuestRow, CollapsibleSection,
                TimerRing, BarChart, Heatmap, StatTile, Sheet, ConfirmDialog, EmptyState, ErrorState, Avatar, Emblem
  i18n/fr.ts                          # toutes les chaînes UI + formatDuration ('1 h 45', '25 min')
  test/ sqliteNodeDb.ts (adaptateur better-sqlite3), fakeClock.ts, factories.ts, globalSetup.ts (TZ)
modules/tatakae-blocking/             # module Expo local (étape 09) : ios/ (Swift), android/ (Kotlin), plugin/
assets/images/landscape.jpg           # copie de artifacts/assets/tatakae-landscape.jpg (720×1280)
```

Règles de dépendance : `app/` → `hooks/`, `ui/`, `services/` ; `services/` → `domain/`, `db/`, natifs ; `domain/` → rien. Aucune requête SQL dans `app/` ni `ui/`. Les écrans n'appellent jamais `Date.now()` directement : `Clock` injecté (`services/clock.ts`, `fakeClock` en test).

Données réactives : `useQuery(key[], fetcher)` relance le fetcher quand `dataEvents.emit(topic)` est émis après une écriture (`'sessions' | 'quests' | 'goals' | 'profile' | 'categories' | 'xp' | 'wallet' | 'settings'`). Pas de cache global ; requêtes SQL indexées, rapides.

---

## 3. Base SQLite

### 3.1 Conventions
- Fichier `tatakae.db` (réel) et `tatakae-demo.db` (mode démo). Le choix du fichier est stocké dans `expo-sqlite/kv-store` (clé `activeDb`), jamais dans la base elle-même. Bascule = fermer la base, rouvrir l'autre, re-monter les providers.
- À l'ouverture : `PRAGMA journal_mode = WAL;` puis `PRAGMA foreign_keys = ON;` (par connexion).
- IDs : `TEXT` UUID v4 (`expo-crypto.randomUUID()`, `crypto.randomUUID()` en test) — stables, générés côté app.
- Instants : `INTEGER` epoch ms UTC (`*_at`). Jours : `TEXT 'YYYY-MM-DD'` dans le fuseau local au moment du calcul (`*_local_date`, `local_date`, `effective_from`).
- Jours de semaine : ISO 1 = lundi … 7 = dimanche. Masque `weekdays_mask` : bit (iso-1).
- Booléens : `INTEGER 0/1`. Durées : secondes entières (`*_sec`) ou minutes pour les objectifs (`goal_min`).
- Les catégories ne sont jamais supprimées (archivage) ; tâches/habitudes : archivage, suppression définitive uniquement via « Supprimer toutes les données ».

### 3.2 Migration 001 — schéma complet

```sql
CREATE TABLE profile (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  display_name     TEXT    NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 24),
  avatar_uri       TEXT,                         -- fichier copié dans documentDirectory
  start_local_date TEXT    NOT NULL,             -- 1er jour d'utilisation
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 30),
  icon        TEXT    NOT NULL,                  -- clé MaterialCommunityIcons (liste fermée)
  color       TEXT    NOT NULL,                  -- token de palette catégorie
  sort_order  INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX ux_categories_active_name ON categories(name COLLATE NOCASE) WHERE archived_at IS NULL;

CREATE TABLE tasks (
  id                   TEXT PRIMARY KEY,
  title                TEXT    NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  category_id          TEXT REFERENCES categories(id),
  due_date             TEXT,                     -- NULL = sans date
  priority             INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (0, 1, 2)), -- basse, normale, haute
  status               TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'archived')),
  completed_at         INTEGER,
  completed_local_date TEXT,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL,
  CHECK (status <> 'done' OR (completed_at IS NOT NULL AND completed_local_date IS NOT NULL))
);
CREATE INDEX ix_tasks_status_due ON tasks(status, due_date);
CREATE INDEX ix_tasks_completed_date ON tasks(completed_local_date);

CREATE TABLE habits (
  id                  TEXT PRIMARY KEY,
  title               TEXT    NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  category_id         TEXT REFERENCES categories(id),
  weekdays_mask       INTEGER NOT NULL CHECK (weekdays_mask BETWEEN 1 AND 127),
  reminder_time       TEXT CHECK (reminder_time IS NULL OR reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  status              TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  start_local_date    TEXT    NOT NULL,
  archived_local_date TEXT,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
CREATE INDEX ix_habits_status ON habits(status);

CREATE TABLE habit_occurrences (
  id           TEXT PRIMARY KEY,
  habit_id     TEXT    NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  local_date   TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  completed_at INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  UNIQUE (habit_id, local_date),
  CHECK (status <> 'done' OR completed_at IS NOT NULL)
);
CREATE INDEX ix_occurrences_date ON habit_occurrences(local_date, status);

CREATE TABLE sessions (
  id                  TEXT PRIMARY KEY,
  source              TEXT    NOT NULL CHECK (source IN ('timer', 'manual')),
  mode                TEXT CHECK (mode IN ('countdown', 'stopwatch')),       -- NULL si manual
  status              TEXT    NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'stopped', 'discarded')),
  active_slot         INTEGER CHECK (active_slot = 1),                       -- 1 si running/paused, sinon NULL
  planned_sec         INTEGER CHECK (planned_sec > 0),
  started_at          INTEGER NOT NULL,
  ended_at            INTEGER,
  last_seen_at        INTEGER,                                               -- heartbeat app au premier plan
  focused_sec         INTEGER CHECK (focused_sec >= 0),                      -- figé à la finalisation
  stop_reason         TEXT CHECK (stop_reason IN ('interrupted', 'tired', 'quest_done', 'other')),
  stop_note           TEXT,
  category_id         TEXT REFERENCES categories(id),                        -- NULL = « Sans catégorie »
  task_id             TEXT REFERENCES tasks(id),
  habit_occurrence_id TEXT REFERENCES habit_occurrences(id),
  is_corrected        INTEGER NOT NULL DEFAULT 0 CHECK (is_corrected IN (0, 1)),
  blocking_requested  INTEGER NOT NULL DEFAULT 0 CHECK (blocking_requested IN (0, 1)),
  finalized_at        INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  CHECK ((status IN ('running', 'paused')) = (active_slot IS NOT NULL)),
  CHECK (source = 'manual' OR mode IS NOT NULL),
  CHECK (mode IS NOT 'countdown' OR planned_sec IS NOT NULL),
  CHECK (task_id IS NULL OR habit_occurrence_id IS NULL),
  CHECK (status IN ('running', 'paused') OR (ended_at IS NOT NULL AND focused_sec IS NOT NULL AND finalized_at IS NOT NULL))
);
CREATE UNIQUE INDEX ux_sessions_single_active ON sessions(active_slot);     -- NULLs distincts → 1 seule active
CREATE INDEX ix_sessions_started ON sessions(started_at);
CREATE INDEX ix_sessions_status_started ON sessions(status, started_at);

CREATE TABLE session_pauses (
  id         TEXT PRIMARY KEY,
  session_id TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at   INTEGER,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX ux_pauses_one_open ON session_pauses(session_id) WHERE ended_at IS NULL;
CREATE INDEX ix_pauses_session ON session_pauses(session_id, started_at);

CREATE TABLE session_day_segments (            -- répartition figée par jour local (minuit, DST)
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  local_date  TEXT    NOT NULL,
  focused_sec INTEGER NOT NULL CHECK (focused_sec > 0),
  PRIMARY KEY (session_id, local_date)
) WITHOUT ROWID;
CREATE INDEX ix_segments_date ON session_day_segments(local_date);

CREATE TABLE focus_ratings (                   -- concentration ressentie, facultative
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rated_at   INTEGER NOT NULL
);

CREATE TABLE session_corrections (             -- audit des corrections manuelles
  id          TEXT PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  revision    INTEGER NOT NULL CHECK (revision >= 1),
  before_json TEXT    NOT NULL,
  after_json  TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE (session_id, revision)
);

CREATE TABLE daily_goal_versions (             -- objectifs datés : jamais réécrits
  id             TEXT PRIMARY KEY,
  weekday        INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  effective_from TEXT    NOT NULL,
  goal_min       INTEGER CHECK (goal_min > 0), -- NULL = aucun objectif
  is_rest        INTEGER NOT NULL DEFAULT 0 CHECK (is_rest IN (0, 1)),
  created_at     INTEGER NOT NULL,
  UNIQUE (weekday, effective_from),            -- même jour : UPSERT
  CHECK (is_rest = 0 OR goal_min IS NULL)
);
CREATE TABLE weekly_goal_versions (
  effective_from TEXT PRIMARY KEY,             -- lundi de la semaine d'effet
  goal_min       INTEGER CHECK (goal_min > 0), -- NULL = aucun objectif hebdo
  created_at     INTEGER NOT NULL
);

CREATE TABLE xp_transactions (
  id           TEXT PRIMARY KEY,
  source_key   TEXT    NOT NULL UNIQUE,        -- 'session:<id>:r<revision>' → anti double récompense
  session_id   TEXT REFERENCES sessions(id),
  amount       INTEGER NOT NULL,               -- peut être négatif (correction)
  rule_version TEXT    NOT NULL,               -- PRODUCT.xp.ruleVersion
  created_at   INTEGER NOT NULL
);
CREATE INDEX ix_xp_session ON xp_transactions(session_id);

CREATE TABLE wallets (                          -- features/crystals uniquement
  id         TEXT PRIMARY KEY,
  currency   TEXT    NOT NULL UNIQUE CHECK (currency IN ('crystal')),
  created_at INTEGER NOT NULL
);
CREATE TABLE wallet_transactions (
  id            TEXT PRIMARY KEY,
  wallet_id     TEXT    NOT NULL REFERENCES wallets(id),
  amount        INTEGER NOT NULL CHECK (amount <> 0),
  reason        TEXT    NOT NULL,              -- ouvert ; aucune règle MVP
  source_key    TEXT    NOT NULL UNIQUE,
  metadata_json TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX ix_wallet_tx_wallet ON wallet_transactions(wallet_id, created_at);

CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE app_state (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
-- app_state keys: 'priorityMission' {kind:'task'|'habit', id}, 'activeBreak' {startedAt, durationSec},
--                 'occurrencesEnsuredThrough' LocalDate, 'pendingSummarySessionId', 'blockingSelection' {count}

CREATE TABLE scheduled_notifications (
  key             TEXT PRIMARY KEY,            -- 'session-end', 'break-end', 'habit:<id>:<weekday>'
  notification_id TEXT    NOT NULL,
  fire_at         INTEGER,
  created_at      INTEGER NOT NULL
);

CREATE TABLE blocking_events (                 -- journal pour diagnostic / récupération
  id               TEXT PRIMARY KEY,
  session_id       TEXT REFERENCES sessions(id),
  action           TEXT    NOT NULL CHECK (action IN ('apply', 'release', 'reconcile_release', 'error')),
  native_confirmed INTEGER NOT NULL CHECK (native_confirmed IN (0, 1)),
  detail           TEXT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX ix_blocking_events_session ON blocking_events(session_id, created_at);
```

Insertion initiale (dans la même migration, idempotente) : `wallets('crystal')` (solde 0, aucune transaction). Les catégories par défaut (`PRODUCT.categories.seed`) et les objectifs sont créés à l'onboarding, pas par la migration.

### 3.3 Migrations
- `migrations/index.ts` : tableau ordonné `{ version: number; name: string; up(tx: SqlDb): Promise<void> }`.
- `migrate(db)` : lit `PRAGMA user_version` ; pour chaque migration > version : transaction → `up` → `PRAGMA user_version = N` (dans la même transaction) ; erreur → rollback + écran d'erreur « Impossible d'ouvrir vos données » (avec export brut du fichier .db possible). `journal_mode` hors transaction.
- Appelé par `SQLiteProvider onInit` (avec `useSuspense` + écran de chargement).
- Règle : une migration livrée n'est jamais modifiée ; uniquement additive. Test : base vide → dernière version ; base v1 avec données → vN conserve les données.

### 3.4 Adaptateur et transactions
```ts
interface SqlDb {
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number; lastInsertRowId: number }>;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
}
```
- `expoSqlDb` : `transaction` = mutex JS d'écriture (file FIFO) + `withExclusiveTransactionAsync` sur iOS/Android ; sur web (non supporté) `withTransactionAsync` sous le même mutex. Toutes les requêtes d'une transaction passent par `tx`.
- `sqliteNodeDb` (tests) : better-sqlite3 en mémoire, même interface, même SQL.

### 3.5 Requêtes de référence
- Sessions comptées : `status IN ('completed','stopped')` (exclut `discarded` et actives ; la session active est ajoutée en direct, §4.6).
- Focus par jour : `SELECT seg.local_date, SUM(seg.focused_sec) FROM session_day_segments seg JOIN sessions s ON s.id = seg.session_id WHERE seg.local_date BETWEEN ? AND ? AND s.status IN ('completed','stopped') GROUP BY seg.local_date`.
- Par catégorie : même requête groupée par `s.category_id` (+ `LEFT JOIN categories` pour nom/archivage).
- XP total : `SELECT COALESCE(SUM(amount),0) FROM xp_transactions`. Cristaux : `SUM(amount)` sur `wallet_transactions` du wallet crystal.

---

## 4. Couche domaine (fonctions pures)

Toutes les fonctions reçoivent `now`/dates en paramètre. Types clés : `LocalDate = string` (branded), `EpochMs = number`, `Interval = { start: EpochMs; end: EpochMs }`.

### 4.1 Temps local (`time/localDate.ts`)
- `toLocalDate(ms): LocalDate` (via `getFullYear/getMonth/getDate`), `startOfLocalDay(d): EpochMs` = `new Date(y, m-1, day).getTime()`, `addDays(d, n)` (arithmétique calendaire, jamais `+ 86400000`), `isoWeekday(d)`, `weekStart(d)` (lundi), `weekDays(d): LocalDate[7]`, `monthDays(d)`, `compareLocalDate`, `isFuture(d, today)`.
- Le moteur JS gère 23 h / 25 h les jours de changement d'heure ; `startOfLocalDay(addDays(d,1))` est la seule façon d'obtenir « minuit suivant ».

### 4.2 Répartition minuit / DST (`time/splitByDay.ts`)
`splitIntervalsByLocalDay(intervals: Interval[]): Array<{ localDate; focusedSec }>` : pour chaque intervalle, découpe aux bornes `startOfLocalDay(next)` ; durée = différence d'epoch ms (temps réel écoulé) ; somme par jour ; secondes = `Math.floor(ms/1000)` **après** somme par jour, en reportant le reste pour que `Σ jours = floor(Σ total)`. Segments à 0 s ignorés.
Cas testés (TZ `Europe/Paris`) : 23:40→00:20 = 20 min + 20 min ; 2026-03-29 01:30→03:30 locale = 60 min réelles ; 2026-10-25 01:30→03:30 locale = 180 min réelles ; dimanche 23:50 → lundi 00:10 = changement de semaine ; pause à cheval sur minuit.

### 4.3 Objectifs (`goals.ts`)
- `resolveDayGoal(date, dailyVersions, profileStart): { kind: 'goal', minutes } | { kind: 'rest' } | { kind: 'none' }` : version du même `weekday` avec le plus grand `effective_from ≤ date` ; `date < profileStart` → `none`.
- `resolveWeekGoal(weekStart, weeklyVersions)` → minutes | null.
- Modifier un objectif = UPSERT d'une version `effective_from = today` (hebdo : lundi courant). Les jours passés restent calculés avec leurs versions. Libellé UI : « S'applique à partir d'aujourd'hui ».

### 4.4 Score quotidien (`scores.ts`)
- `dayScore(focusSec, goalMin) = Math.min(100, (focusSec/60) / goalMin * 100)` (float, jamais arrondi en stockage).
- `dayCellState(date, today, goal, focusSec)` →
  `future` (aucun score) | `rest` (« Repos », neutre) | `noGoal` (« — ») | `today` (score + « en cours ») | `past` (score, 0 si aucune session).
- `scoreBucket(score)` sur la valeur brute : `<40 low` (orange atténué), `<80 mid` (ambre), `<100 good` (vert clair), `=100 full` (vert soutenu).
- Affichage : `Math.floor` (cohérent avec les seuils entiers : 99,6 → « 99 », pas « 100 »). Toujours un texte + `accessibilityLabel` (« Jeudi 22 octobre, 88 %, en cours ») — la couleur n'est jamais seule.

### 4.5 Radar (`radar.ts`) — fenêtre `[today-13, today]`
Sortie par axe : `{ axis, value: number | null, status: 'ok' | 'insufficient', inProgress: boolean, sampleLabel: string, explanation: string }`.
- **Force** : notes des sessions finalisées dont `ended_at` ∈ fenêtre ; `n < 3` → insufficient (« Données insuffisantes — 2/3 sessions notées ») ; sinon `moyenne × 20` ; libellé « n sessions notées ». Sessions non notées ignorées (pas de zéro).
- **Endurance** : jours d ∈ fenêtre, d ≤ today, `goal.kind = 'goal'` ; `min(100, Σ focus(d) / Σ goal(d) × 100)` ; dénominateur 0 → insufficient ; `inProgress = today inclus`.
- **Mental** : sessions `source='timer' AND mode='countdown' AND is_corrected=0 AND status IN ('completed','stopped')` finies dans la fenêtre (les `discarded` < `PRODUCT.timer.minCountedSec` sont exclues) ; `completed / (completed + stopped) × 100` ; 0 clôturée → insufficient. Motifs d'arrêt affichés en neutre (« 2 arrêts : interruption ×1, fatigue ×1 »).
- **Constance** : jours d ∈ fenêtre, `d < today`, `goal.kind = 'goal'` ; `jours où focus ≥ goal / jours prévus × 100` ; 0 jour → insufficient. Today exclu jusqu'à demain (le passage de minuit le fait entrer).
- Rendu : axe insuffisant = pas de sommet tracé, libellé « — » + « n/d » ; polygone tracé sur les axes disponibles (≥ 3) sinon seulement les points ; toucher un axe → bulle valeur exacte (1 décimale) + explication ; liste textuelle accessible sous le radar (toujours rendue pour lecteurs d'écran, visible si `fontScale > 1.3`).

### 4.6 Totaux uniques (`totals.ts`)
- `buildFocusByDay(dbRows, liveSession | null, now) → Map<LocalDate, sec>` : lignes DB + segments en direct de la session active (`splitIntervalsByLocalDay(focusIntervals(active, now))`).
- `sumRange(map, from, to)`, `categoryBreakdown(rows, live, date)`.
- Hook unique `useFocusTotals(range)` consommé par **AppHeader** (today + semaine courante), **Accueil** (calendrier, catégories), **Stats** (KPIs, histogramme, objectif hebdo). Aucune autre source de totaux n'est autorisée (règle de revue).
- Header : toujours la date réelle du jour (`useToday`), jamais la date sélectionnée.

### 4.7 XP / niveaux (`xp.ts`) — HYPOTHÈSE PRODUIT
- `xpForFocusedSec(sec) = Math.floor(sec / 60) * PRODUCT.xp.perFullMinute` (par session, pas par segment).
- Correction : `delta = xpForFocusedSec(newSec) − Σ xp déjà attribuée à la session`, insérée avec `source_key = session:<id>:r<revision>` (peut être négatif). Invariant testé : `Σ xp(session) = xpForFocusedSec(focused_sec courant)`.
- Valider une quête : 0 XP. Saisie manuelle : `PRODUCT.xp.manualEntriesEarnXp` (true par défaut).
- Niveau : `levelThreshold(n)` = XP cumulée pour atteindre le niveau n (n ≥ 1) ; défaut triangulaire `step × (n−1) × n / 2` avec `step = 60` (N2 = 60 XP, N3 = 180, N10 = 2 700). `levelFromXp(xp) → { level, xpIntoLevel, xpForNext, progress }`.

### 4.8 Quêtes et habitudes (`quests.ts`, `habits.ts`)
- `occurrenceDatesToEnsure(habit, from, to)` : jours du masque, `≥ start_local_date`, `≤ archived_local_date`. Service : `INSERT OR IGNORE` sur `[occurrencesEnsuredThrough+1 … today + horizon]` au démarrage, au passage de minuit et à chaque création/modification d'habitude.
- Modification du masque : 1) matérialiser jusqu'à aujourd'hui avec l'ancien masque, 2) supprimer les occurrences `pending` **futures** (`> today`) hors nouveau masque, 3) matérialiser avec le nouveau. Le passé n'est jamais modifié.
- `questsForDate(date, today, tasks, occurrences, config)` : tâches `due_date = date` ; si `date = today` : + tâches ouvertes en retard (`due_date < today`, badge « En retard ») ; + tâches terminées ce jour (`completed_local_date = date`) ; occurrences du jour. Tri : mission prioritaire, non terminées (priorité desc, puis titre), terminées (repliables).
- `habitCalendarState(date, habit, occurrence, today)` : `done` | `missed` (prévu, passé, non validé) | `planned` (aujourd'hui/futur) | `rest` (jour non prévu dans le masque = repos prévu) | `absent` (avant création / après archivage / pas de donnée). Libellés + icônes distincts.
- Mission prioritaire : `app_state.priorityMission` (tâche ouverte ou habitude active) ; invalide (terminée/archivée) → ignorée et effacée.

### 4.9 Stats (`stats.ts`)
- Période `week` (lundi→dimanche) ou `month` ; navigation ±1.
- `focusTotal` = Σ segments de la période ; `sessionCount` = sessions comptées dont `toLocalDate(started_at)` ∈ période ; `avgSessionSec = Σ focused_sec(ces sessions) / count` (null si 0 → « — »).
- Histogramme : une barre par jour, ligne d'objectif du jour, jours futurs vides (pas de « 0 »).
- Objectif hebdo : `focus semaine / weekGoal` (vue mois : liste des semaines du mois).
- Heatmap : 18 dernières semaines, cellule = `dayCellState` + bucket (même légende que le calendrier).
- Historique : sessions paginées (20), badges « Saisie manuelle » / « Corrigée » / « Chrono libre » / « Arrêtée tôt ».

---

## 5. Timer : machine d'état et fiabilité

### 5.1 États (`timer/machine.ts`)
```
idle ──start──▶ running ──pause──▶ paused ──resume──▶ running
running|paused ──finish(user)──▶ completed (stopwatch) | stopped (countdown avant échéance, motif facultatif)
running ──deadline atteinte (reconcile)──▶ completed (ended_at = deadline, jamais now)
running|paused ──discard──▶ discarded (autorisé seulement si focus < minCountedSec ; rien n'est compté)
```
- `pausedMs(pauses, upTo)` : Σ pauses fermées + pause ouverte jusqu'à `upTo`.
- `focusIntervals(session, pauses, upTo)` : `[started_at, upTo]` moins les pauses, **tronqué** pour que la somme ≤ `planned_sec` (countdown). Base unique de l'affichage, de la finalisation et des segments.
- `deadline(session, pauses)` (countdown, running) = `started_at + planned_sec*1000 + pausedMs(closed)`.
- `reconcile(session, pauses, now, config)` → `{ type: 'none' } | { type: 'autoComplete', endedAt } | { type: 'confirmStopwatch', lastSeenAt, elapsedSec } | { type: 'resumePaused' }`.
  - countdown running et `now ≥ deadline` → `autoComplete(deadline)`.
  - stopwatch running et (`now − last_seen_at > stopwatchGapConfirmMin` ou `elapsed > stopwatchMaxPlausibleMin`) → `confirmStopwatch` : dialogue « Garder 3 h 12 » / « Garder jusqu'à 14:05 (dernière activité) » / « Saisir la durée » (≤ elapsed).
  - paused depuis longtemps → rien d'automatique ; écran Focus propose Reprendre / Terminer.
- Affichage : `useNow(250 ms)` uniquement pour le rendu ; valeur = f(horodatages, now). `setInterval` ne porte aucun état.

### 5.2 Persistance et récupération
- Toutes les transitions écrivent en base **avant** de mettre à jour l'UI (start : INSERT session ; pause : INSERT pause ; resume : UPDATE pause.ended_at ; fin : finalisation).
- Heartbeat : `last_seen_at` mis à jour toutes les 30 s au premier plan et au passage `background`.
- `SessionRuntime` (provider racine) appelle `sessionService.reconcile()` : au montage après migrations, à chaque `AppState → active`, et à chaque tick quand `now ≥ deadline` (fin pendant que l'app est ouverte). Puis réconciliation blocage (§7.4) et notifications (annule `session-end` orpheline).
- Après finalisation : `app_state.pendingSummarySessionId` → l'écran bilan est proposé même après redémarrage ; effacé quand l'utilisateur ferme le bilan.

### 5.3 Anti-doublons
- Une seule session active : index unique `ux_sessions_single_active` ; `start` intercepte la violation → « Une session est déjà en cours » + lien vers elle.
- Double toucher : `useSingleFlight` (bouton désactivé pendant la promesse) + transitions idempotentes côté service.
- Finalisation idempotente (transaction unique) :
  1. `SELECT` session ; si `active_slot IS NULL` → retourner l'état existant (pas d'erreur, pas de récompense).
  2. Fermer la pause ouverte à `endedAt`.
  3. Calculer `focusIntervals`, `focused_sec`, statut (fonctions pures).
  4. `UPDATE sessions SET status, active_slot = NULL, ended_at, focused_sec, stop_reason, finalized_at … WHERE id = ? AND active_slot = 1` ; `changes !== 1` → throw (rollback).
  5. `INSERT` segments (si comptée).
  6. `INSERT OR IGNORE INTO xp_transactions (source_key = 'session:<id>:r0', …)` si XP > 0.
  Effets hors transaction ensuite : annuler notification, libérer blocage, `dataEvents.emit('sessions','xp')`.
- Correction manuelle (transaction) : `session_corrections` (revision+1, before/after), UPDATE session (`is_corrected = 1`), segments recalculés (un intervalle contigu depuis `started_at`, ou date/heure saisies), delta XP `r<revision>`.
- Valider la quête depuis le bilan : action explicite, idempotente (`UPDATE … WHERE status = 'open'` / `'pending'`).

### 5.4 Pause courte (break)
`app_state.activeBreak = { startedAt, durationSec }` + notification `break-end`. Jamais compté comme focus, jamais de session créée. Fin de pause → écran « Pause terminée » ; le cycle suivant démarre uniquement sur « Lancer une session ».

---

## 6. Notifications locales (`notificationService.ts`)
- Init au démarrage : `setNotificationHandler` (premier plan : pas de bannière pour `session-end`/`break-end` car l'UI gère ; bannière pour rappels), canaux Android `timer` (importance HIGH) et `reminders` (DEFAULT).
- Permission demandée en contexte : au premier lancement de session (« Être prévenu à la fin ? ») ou à l'activation d'un rappel. Refus → aucune erreur, le timer fonctionne ; statut visible dans Réglages > Notifications.
- `scheduleSessionEnd(deadline)` (trigger `DATE`) à start/resume ; `cancel` à pause/fin/abandon ; clé `session-end` dans `scheduled_notifications` (remplacement atomique).
- `scheduleBreakEnd`, `syncHabitReminders()` : triggers `WEEKLY` (weekday expo : 1 = dimanche → `expo = iso % 7 + 1`), un par jour prévu ; resynchronisation complète à chaque modification/archivage d'habitude et au démarrage.
- Limite iOS : 64 notifications planifiées → plafonner les rappels (`PRODUCT.notifications.maxHabitReminders = 50`) et afficher un avertissement.
- Android : sans `SCHEDULE_EXACT_ALARM` accordé, livraison approximative (la session se termine quand même à l'heure par horodatage). Déclarer la permission ; bouton « Autoriser l'heure exacte » (`requestExactAlarmPermissionsAsync`) dans Réglages. Ne pas utiliser `USE_EXACT_ALARM` (réservé par Play aux apps réveil/agenda).
- Web : service no-op.

---

## 7. Blocage des distractions

### 7.1 Règles officielles vérifiées
- **iOS** (Screen Time API, iOS 16+) : `FamilyControls.AuthorizationCenter.requestAuthorization(for: .individual)` (Face ID/code), `FamilyActivityPicker` (jetons opaques : pas de nom ni d'icône d'app récupérables → afficher « 3 apps sélectionnées »), `ManagedSettingsStore().shield.applications = tokens`, retrait par `nil`/`clearAllSettings()`. Capacité `com.apple.developer.family-controls` requise ; **distribution (TestFlight/App Store) soumise à demande d'entitlement auprès d'Apple** pour l'app ET chaque extension. Les boucliers ne bloquent pas réellement dans le simulateur → test sur appareil réel. `DeviceActivityMonitor` = extension séparée + App Group ; intervalle de planning minimal 15 min (à confirmer sur appareil).
- **Android** : pas d'API publique de blocage. Approche conforme Play : `UsageStatsManager` (permission spéciale `PACKAGE_USAGE_STATS`, accordée via `Settings.ACTION_USAGE_ACCESS_SETTINGS`) dans un foreground service (`FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE`, Android 14+ : type `specialUse` + déclaration Play Console) + écran de recouvrement (`SYSTEM_ALERT_WINDOW`, via `Settings.ACTION_MANAGE_OVERLAY_PERMISSION`). **Pas d'AccessibilityService** (Play exige d'utiliser l'API la plus étroite ; `isAccessibilityTool` interdit pour un bloqueur). Liste d'apps via `<queries>` intent `MAIN/LAUNCHER` — **pas de `QUERY_ALL_PACKAGES`**.
- Web / Expo Go / build sans module : non disponible.

### 7.2 Interface (`services/blocking/types.ts`)
```ts
type BlockingAvailability =
  | { kind: 'unavailable'; reason: 'platform' | 'moduleMissing' | 'entitlementMissing' }
  | { kind: 'needsPermission'; missing: Array<'familyControls' | 'usageAccess' | 'overlay' | 'notifications'> }
  | { kind: 'needsSelection' }
  | { kind: 'ready'; selectionCount: number };

type NativeBlockState = { active: boolean; confirmedAt: EpochMs | null; sessionId: string | null; selectionCount: number };

interface BlockingProvider {
  getAvailability(): Promise<BlockingAvailability>;
  requestPermissions(): Promise<BlockingAvailability>;   // ouvre les écrans système nécessaires
  pickApps(): Promise<{ selectionCount: number }>;       // iOS : FamilyActivityPicker ; Android : liste maison
  apply(sessionId: string, endsAt: EpochMs | null): Promise<NativeBlockState>;
  release(sessionId: string | null): Promise<NativeBlockState>;
  getNativeState(): Promise<NativeBlockState>;           // lu côté natif, jamais déduit côté JS
}
```
`blocking/index.ts` choisit : `requireOptionalNativeModule('TatakaeBlocking')` absent → `unavailableProvider` ; sinon `iosProvider`/`androidProvider`.

### 7.3 UI (Focus et Réglages > Blocage)
- Libellé uniquement dérivé de `NativeBlockState` + disponibilité :
  - `active && confirmedAt` → « Blocage actif · 3 apps » ;
  - `unavailable` → « Blocage non disponible dans cette version » (+ « Pourquoi ? » : raison précise) ;
  - `needsPermission` → « Autorisation requise » + bouton ;
  - `needsSelection` → « Choisir les apps à bloquer » ;
  - échec d'application → « Le blocage n'a pas pu être activé » (session continue).
- « Applications bloquées » n'apparaît **jamais** sans `active === true` renvoyé par le natif. Aucun logo d'app tierce.
- Interrupteur avant session « Bloquer les distractions » (désactivé si non `ready`). Aucune notion de cristaux.

### 7.4 Cycle de vie
`blockingService` : `apply` au start et au resume ; `release` à pause, fin, abandon. Réconciliation (lancement + retour premier plan) : si `getNativeState().active` et aucune session `running` correspondante → `release` + `blocking_events('reconcile_release')`. Android : le service natif s'arrête seul à `endsAt` (survit à la fermeture de l'app). iOS niveau 1 : bouclier retiré par l'app (au retour, via notification de fin) ; niveau 2 (si temps) : extension `DeviceActivityMonitor` (via config plugin, ex. `@bacons/apple-targets`) qui retire le bouclier à `intervalDidEnd` pour sessions ≥ 15 min.

### 7.5 Module natif `modules/tatakae-blocking`
- `npx create-expo-module@latest --local tatakae-blocking`. Swift : `FamilyControls`, `ManagedSettings`, vue picker via `ExpoView` SwiftUI ; persistance de la sélection (`FamilyActivitySelection` encodée) dans App Group `UserDefaults`. Kotlin : `BlockingForegroundService`, `OverlayController`, `AppListProvider`, SharedPreferences.
- Config plugin : entitlement family-controls + App Group (iOS) ; permissions, `<service android:foregroundServiceType="specialUse">` + `PROPERTY_SPECIAL_USE_FGS_SUBTYPE`, `<queries>` (Android).
- Statut à documenter dans le README : « implémenté, compilé, non vérifié sur appareil » tant qu'un test réel n'a pas eu lieu. Ne jamais l'annoncer comme fonctionnel sans test.

---

## 8. Fichier central des hypothèses : `src/config/product.ts`

Un seul objet `as const` typé, chaque entrée commentée `// HYPOTHÈSE PRODUIT — modifiable`. Aucun nombre magique produit ailleurs (règle de revue : grep des littéraux).

```ts
export const PRODUCT = {
  week: { firstIsoWeekday: 1 },
  goals: {
    defaultDailyMin: { 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 60, 7: 'rest' },  // proposé à l'onboarding, modifiable
    defaultWeekly: 'sumOfDaily' as const,                                       // 660 min
  },
  timer: {
    defaultFocusMin: 25, focusPresetsMin: [15, 25, 45, 60], minFocusMin: 5, maxFocusMin: 180,
    defaultBreakMin: 5, breakPresetsMin: [3, 5, 10, 15],
    minCountedSec: 60,                   // en dessous : « Abandonner » sans enregistrement possible
    heartbeatSec: 30, stopwatchGapConfirmMin: 10, stopwatchMaxPlausibleMin: 240,
    stopReasons: ['interrupted', 'tired', 'quest_done', 'other'],
  },
  score: { buckets: { low: 40, mid: 80, good: 100 }, display: 'floor' as const },
  radar: { windowDays: 14, forceMinRatings: 3, mentalMinClosed: 1, enduranceMinGoalDays: 1, constanceMinDays: 1, ratingScale: 20 },
  xp: { ruleVersion: 'xp-v1', perFullMinute: 1, questCompletionBonus: 0, manualEntriesEarnXp: true, levelStepXp: 60 },
  quests: { todayIncludesOverdue: true, todayIncludesUndated: false, homeListMax: 3, occurrenceHorizonDays: 14 },
  categories: {
    homeTopN: 3,
    seed: [ { name: 'Études', icon: 'school' }, { name: 'Projet', icon: 'hammer-wrench' },
            { name: 'Lecture', icon: 'book-open-variant' }, { name: 'Sport', icon: 'run' } ],
  },
  crystals: { initialBalance: 0, earningRules: [] as const, shopEnabled: false },
  stats: { heatmapWeeks: 18, historyPageSize: 20 },
  notifications: { maxHabitReminders: 50 },
  profile: { maxNameLength: 24 },
} as const;
```

---

## 9. Stratégie de tests

| Niveau | Outil | Contenu | Commande |
|---|---|---|---|
| Domaine pur | Jest (preset `jest-expo`), `globalSetup` force `process.env.TZ = 'Europe/Paris'` | localDate, splitByDay (minuit, DST mars/octobre 2026, changement de semaine), goals (versions), scores + états de cellule, radar (chaque axe, seuils, insuffisant, today en cours), xp/niveaux, machine du timer (pause, échéance, troncature, reconcile), quests/habits (occurrences, changement de masque), stats | `npm test` |
| Intégration DB | Jest + `sqliteNodeDb` (better-sqlite3 mémoire) | migrations 0→N ; contraintes (1 seule active, 1 pause ouverte, CHECKs) ; finalisation idempotente (`Promise.all([finish, finish])` → 1 seule ligne XP) ; redémarrage simulé (nouvelle instance de service + `reconcile` après échéance → completed à `deadline`) ; correction (invariant XP) ; occurrences idempotentes ; export JSON | `npm test` |
| Composants | `@testing-library/react-native` | DayCell (5 états, libellés a11y), RadarChart (insuffisant ≠ 0), libellé blocage (jamais « Applications bloquées » sans état confirmé), AppHeader (date du jour même si autre date sélectionnée) | `npm test` |
| Statique | `tsc --noEmit`, `expo lint`, `npx expo-doctor` | 0 erreur | `npm run typecheck && npm run lint` |
| Visuel | web (`npx expo start --web`) à 360×640, 390×844, 430×932 + police ×1,3 ; simulateur/émulateur si disponible | checklist `steps.md` étape 10 | manuel, captures |
| Natif | appareil réel | protocole blocage + notifications documenté dans README | manuel |

`Clock` et `newId` injectés ; aucun test ne dépend de l'heure réelle. Couverture visée : `src/domain` ≥ 95 % lignes.

---

## 10. Direction artistique

### 10.1 Tokens (`ui/theme/tokens.ts`)
```ts
colors: {
  bg: '#05070D', night: '#0A1224', nightRaised: '#0F1A33',
  panel: (alpha: number) => `rgba(10,18,36,${alpha})`,     // Accueil/Profil 0.90, Quêtes 0.96, graphes Stats 1
  border: 'rgba(120,160,255,0.18)', borderStrong: 'rgba(76,155,255,0.55)', divider: 'rgba(160,180,220,0.10)',
  action: '#2F7BFF', actionBright: '#4C9BFF', actionPressed: '#1F5FD6', actionMuted: 'rgba(47,123,255,0.16)',
  text: '#F4F7FF', textMuted: '#A3B3CF', textFaint: '#6F7F9E',
  score: { low: '#D9895E', mid: '#E2B144', good: '#8BDB9A', full: '#2FB86A', neutral: '#7B8AA8' },
  danger: '#FF7A7A', warning: '#F2C14E',
  category: ['#4C9BFF', '#7C6CFF', '#38C6D9', '#E2B144', '#E57AA8', '#8BDB9A', '#F28C5B', '#A3B3CF'],
},
radius: { sm: 4, md: 6, lg: 8 },          // coins légèrement anguleux, jamais > 10
border: { hairline: StyleSheet.hairlineWidth, thin: 1 },
space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
touch: { min: 44 },
type: { // police système ; chiffres en fontVariant ['tabular-nums']
  title: { size: 24, line: 30, weight: '700' }, h2: { size: 17, line: 22, weight: '600' },
  body: { size: 15, line: 20, weight: '400' }, label: { size: 13, line: 17, weight: '500' },
  caption: { size: 12, line: 16, weight: '400' }, timer: { size: 76, line: 84, weight: '700' },
},
```
Contraste : `text`/`textMuted` sur panneau 0.90 ≥ 4.5:1 (vérifier). Pas de glow > `shadowRadius 8`, un seul halo autorisé : anneau du timer.

### 10.2 Composants clés
- `ScreenBackground` : unique instance dans le layout racine ; `expo-image` absolu `contentFit="cover"` `contentPosition="center"` + voile `night` dont l'opacité dépend de la route (`usePathname`) : Accueil/Profil 0.35, Quêtes 0.45, Stats 0.50, Focus 0.65 ; dégradé haut (`expo-linear-gradient`) pour la lisibilité du header. Le contenu commence directement sous le header : **aucun espace décoratif** au-dessus/au-dessous.
- `AppHeader` (~76 pt hors safe area, `maxFontSizeMultiplier 1.3`) : carte flottante ; `Avatar` 52 pt carré arrondi à gauche (→ Profil) ; à droite, ligne 1 pseudo en capitales · « Lvl 12 » · cristaux, ligne 2 deux colonnes « Today 1 h 45 / 2 h » et « Week 6 h 40 / 11 h » avec chacune sa `ProgressBar` (dégradé bleu, piste sombre) ; touchables → Stats (semaine courante). Visible aussi sur Focus et formulaires.
- `Panel` : fond `panel(alpha)`, bordure hairline `border`, rayon `md`, padding `lg`, jamais imbriqué dans un autre `Panel` (utiliser des séparateurs).
- `TabBar` : 4 onglets icône + libellé, actif = `actionBright` + soulignement lumineux, safe area bas. Rendue une seule fois dans le layout racine (le navigateur d'onglets a `tabBar={() => null}`), donc présente aussi sur Focus, réglages et formulaires (masquée pendant l'onboarding) ; l'onglet actif d'un écran empilé vient de `tabForPath` (testé).
- `WeekCalendar` : une ligne « ‹ 19 – 25 Oct 2026 › » (flèches avec `hitSlop` ≥ 44 pt), puis 7 `DayCell` compactes (~64 pt : lettre, date, score coloré ou « — » / « Rest »), chacune dans une cellule ; sélection = contour `borderStrong` + halo, score en cyan.
- `QuestRow` / `QuestGroup` : lignes d'une même section dans une seule cellule, séparées par des filets ; case ronde animée (remplissage en ressort, onde, coche, titre barré qui se trace ; état optimiste puis état stocké), bouton Start, chevron vers la fiche. Les quêtes faites restent dans la liste, cochées. Appui long = mission prioritaire.
- `RadarChart` (SVG, grille en losange, polygone en dégradé + contour `barBright`, libellés courts) à côté de `RadarLegend` (nom + valeur cyan par axe ; avec texte agrandi, ligne détaillée) ; toucher un axe ouvre `RadarExplanation`. `CategoryBars` (échelle commune = max du jour), `TimerRing` (piste fine + arc en dégradé avec halo), `BarChart` (react-native-gifted-charts), `Heatmap` (une teinte bleue, légende textuelle).
- `Emblem` : avatar par défaut original (lame stylisée + croissant, SVG maison), pas de personnage.
- Layout adaptatif (`useResponsiveLayout`) : blocs Radar/Catégories empilés si `width < 360` ou `fontScale > 1.2`.

### 10.3 Paysage
Asset original fourni (`artifacts/assets/tatakae-landscape.jpg`, 720×1280, nuit bleue, montagnes, lac, château illuminé, pins) → `assets/images/landscape.jpg`. Même image sur toutes les pages, assombrie différemment. Résolution limitée : acceptable sous voile sombre ; prévoir une version ≥ 1290×2796 si disponible. Ne jamais intégrer de capture de maquette.

---

## 11. Écarts d'implémentation (ajoutés au dépôt)

Constatés pendant les étapes 01–02 ; le reste du document reste la référence.

| # | Plan | Réalité | Pourquoi |
|---|---|---|---|
| 1 | Routes dans `app/` à la racine | Routes dans `src/app/` (tous les chemins `app/…` du plan se lisent `src/app/…`) | Convention du template Expo SDK 58 (`AGENTS.md` du template) ; alias `@/*` → `src/*` |
| 2 | Branches `step-02-data-core`, … (steps.md) | Branches demandées par le propriétaire : `step-01-scaffold`, `step-02-data-and-domain`, `step-03-shell-and-header`, … | Nommage imposé ; le contenu suit `steps.md` étape par étape |
| 3 | Transactions : `withExclusiveTransactionAsync` hors web, mutex JS | Une seule connexion + `BEGIN IMMEDIATE` sous mutex FIFO (`src/db/serializedDb.ts`), sur toutes les plateformes ; les lectures attendent la transaction ouverte | `withExclusiveTransactionAsync` ouvre une 2ᵉ connexion où `PRAGMA foreign_keys` est désactivé et n'existe pas sur web ; un seul chemin de code, testé à l'identique en Node |
| 4 | Unicité de catégorie via l'index `NOCASE` | Vérification Unicode (NFC + minuscules `fr`) dans le repository + l'index en filet de sécurité | `COLLATE NOCASE` ne replie que l'ASCII (« Études » ≠ « études ») — bug trouvé par test |
| 5 | `activeDb` dans `expo-sqlite/kv-store` | Idem sur natif ; `localStorage` sur web | l'API synchrone du kv-store exige `SharedArrayBuffer` (isolation cross-origin) que le serveur de dev ne fournit pas ; l'accès SQLite asynchrone fonctionne sans |
| 6 | `metro.config.js` : en-têtes COOP/COEP | Seulement le type d'asset `wasm` ; plugin `expo-router` `headers` pour l'hébergement | `enhanceMiddleware` n'enveloppe pas la route HTML en SDK 58 : l'en-tête n'était jamais envoyé |
| 7 | `settings.ts`, `appState.ts` | `src/db/repositories/keyValue.ts` exporte `settingsRepo` et `appStateRepo` | même code pour deux tables |
| 8 | Étape 01 : tokens, `Panel`, `TabBar`, `AppHeader`, onglets, `fr.ts` | Reportés à l'étape 03 (shell et header) ; `fr.ts` minimal et `ScreenBackground` (expo-image) créés à l'étape 02 | périmètre de l'étape 01 déjà livré ; `ImageBackground` (déprécié SDK 58) retiré |
| 9 | `@testing-library/react-native` dès l'étape 01 | Installé quand le premier test de composant l'exige | étape 03 : la logique du header est testée en pur (`domain/totals.ts`, `formatDuration`), le composant reste sans test de rendu |
| 10 | Interface en français, `src/i18n/fr.ts` | Interface en **anglais**, `src/i18n/en.ts` (`fr.ts` supprimé à l'étape 03) ; catégories seed en anglais | Décision du propriétaire ; prime sur PRODUCT_SPEC §1 et le reste de ce document |
| 11 | Onglets : fond de scène transparent | Chaque écran d'onglet a pour racine `TabScene` (masque la scène non focalisée) | Sur web, sans `react-native-screens`, les onglets inactifs restent montés sous la scène active (seulement `zIndex: -1`) et transparaissent à travers le fond transparent |
| 12 | `SQLiteProvider onInit` inline | `onInit` stable (fonction de module) ; `usePathname` isolé dans `RouteBackground` | Le layout racine se re-rendait à chaque navigation (`usePathname`) avec un `onInit` inline : chaque changement d'onglet revenait à l'Accueil. Les deux causes sont neutralisées |
