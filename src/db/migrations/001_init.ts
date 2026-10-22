import type { SqlDb } from '../SqlDb';
import type { Migration } from './types';

const SCHEMA_V1 = `
CREATE TABLE profile (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  display_name     TEXT    NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 24),
  avatar_uri       TEXT,
  start_local_date TEXT    NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 30),
  icon        TEXT    NOT NULL,
  color       TEXT    NOT NULL,
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
  due_date             TEXT,
  priority             INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (0, 1, 2)),
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
  mode                TEXT CHECK (mode IN ('countdown', 'stopwatch')),
  status              TEXT    NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'stopped', 'discarded')),
  active_slot         INTEGER CHECK (active_slot = 1),
  planned_sec         INTEGER CHECK (planned_sec > 0),
  started_at          INTEGER NOT NULL,
  ended_at            INTEGER,
  last_seen_at        INTEGER,
  focused_sec         INTEGER CHECK (focused_sec >= 0),
  stop_reason         TEXT CHECK (stop_reason IN ('interrupted', 'tired', 'quest_done', 'other')),
  stop_note           TEXT,
  category_id         TEXT REFERENCES categories(id),
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
CREATE UNIQUE INDEX ux_sessions_single_active ON sessions(active_slot);
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

CREATE TABLE session_day_segments (
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  local_date  TEXT    NOT NULL,
  focused_sec INTEGER NOT NULL CHECK (focused_sec > 0),
  PRIMARY KEY (session_id, local_date)
) WITHOUT ROWID;
CREATE INDEX ix_segments_date ON session_day_segments(local_date);

CREATE TABLE focus_ratings (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rated_at   INTEGER NOT NULL
);

CREATE TABLE session_corrections (
  id          TEXT PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  revision    INTEGER NOT NULL CHECK (revision >= 1),
  before_json TEXT    NOT NULL,
  after_json  TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE (session_id, revision)
);

CREATE TABLE daily_goal_versions (
  id             TEXT PRIMARY KEY,
  weekday        INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  effective_from TEXT    NOT NULL,
  goal_min       INTEGER CHECK (goal_min > 0),
  is_rest        INTEGER NOT NULL DEFAULT 0 CHECK (is_rest IN (0, 1)),
  created_at     INTEGER NOT NULL,
  UNIQUE (weekday, effective_from),
  CHECK (is_rest = 0 OR goal_min IS NULL)
);

CREATE TABLE weekly_goal_versions (
  effective_from TEXT PRIMARY KEY,
  goal_min       INTEGER CHECK (goal_min > 0),
  created_at     INTEGER NOT NULL
);

CREATE TABLE xp_transactions (
  id           TEXT PRIMARY KEY,
  source_key   TEXT    NOT NULL UNIQUE,
  session_id   TEXT REFERENCES sessions(id),
  amount       INTEGER NOT NULL,
  rule_version TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX ix_xp_session ON xp_transactions(session_id);

CREATE TABLE wallets (
  id         TEXT PRIMARY KEY,
  currency   TEXT    NOT NULL UNIQUE CHECK (currency IN ('crystal')),
  created_at INTEGER NOT NULL
);

CREATE TABLE wallet_transactions (
  id            TEXT PRIMARY KEY,
  wallet_id     TEXT    NOT NULL REFERENCES wallets(id),
  amount        INTEGER NOT NULL CHECK (amount <> 0),
  reason        TEXT    NOT NULL,
  source_key    TEXT    NOT NULL UNIQUE,
  metadata_json TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX ix_wallet_tx_wallet ON wallet_transactions(wallet_id, created_at);

CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE app_state (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);

CREATE TABLE scheduled_notifications (
  key             TEXT PRIMARY KEY,
  notification_id TEXT    NOT NULL,
  fire_at         INTEGER,
  created_at      INTEGER NOT NULL
);

CREATE TABLE blocking_events (
  id               TEXT PRIMARY KEY,
  session_id       TEXT REFERENCES sessions(id),
  action           TEXT    NOT NULL CHECK (action IN ('apply', 'release', 'reconcile_release', 'error')),
  native_confirmed INTEGER NOT NULL CHECK (native_confirmed IN (0, 1)),
  detail           TEXT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX ix_blocking_events_session ON blocking_events(session_id, created_at);
`;

export const MIGRATION_001_INIT: Migration = {
  version: 1,
  name: 'init',
  async up(tx: SqlDb, ctx) {
    await tx.exec(SCHEMA_V1);
    // The single crystal wallet exists from day one with a zero balance (no transaction).
    await tx.run('INSERT OR IGNORE INTO wallets (id, currency, created_at) VALUES (?, ?, ?)', [
      'wallet-crystal',
      'crystal',
      ctx.now,
    ]);
  },
};
