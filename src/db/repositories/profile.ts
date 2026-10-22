import type { LocalDate, Profile } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { type ProfileRow, toProfile } from '../rows';

export async function getProfile(db: SqlDb): Promise<Profile | null> {
  const row = await db.get<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  return row ? toProfile(row) : null;
}

export interface NewProfile {
  displayName: string;
  avatarUri: string | null;
  startLocalDate: LocalDate;
}

export async function createProfile(db: SqlDb, input: NewProfile, now: number): Promise<void> {
  await db.run(
    `INSERT INTO profile (id, display_name, avatar_uri, start_local_date, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)`,
    [input.displayName.trim(), input.avatarUri, input.startLocalDate, now, now],
  );
}

export async function updateProfile(
  db: SqlDb,
  patch: { displayName?: string; avatarUri?: string | null },
  now: number,
): Promise<void> {
  const current = await getProfile(db);
  if (!current) throw new Error('No profile to update');
  await db.run('UPDATE profile SET display_name = ?, avatar_uri = ?, updated_at = ? WHERE id = 1', [
    (patch.displayName ?? current.displayName).trim(),
    patch.avatarUri === undefined ? current.avatarUri : patch.avatarUri,
    now,
  ]);
}
