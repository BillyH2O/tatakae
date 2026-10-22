import { getActiveSession, listPauses } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import type { Session, SessionPause } from '../domain/types';
import { useQuery } from './useQuery';

export interface ActiveSessionState {
  session: Session;
  pauses: SessionPause[];
}

async function loadActiveSession(db: SqlDb): Promise<ActiveSessionState | null> {
  const session = await getActiveSession(db);
  return session ? { session, pauses: await listPauses(db, session.id) } : null;
}

/** The running/paused session with its pauses. `data` is undefined while loading, null when idle. */
export function useActiveSession() {
  return useQuery(['sessions'], loadActiveSession);
}
