export type DataTopic =
  | 'sessions'
  | 'quests'
  | 'goals'
  | 'profile'
  | 'categories'
  | 'xp'
  | 'wallet'
  | 'settings'
  | 'notifications';

type Listener = (topics: readonly DataTopic[]) => void;

/** Tiny pub/sub: services emit after a write, `useQuery` refetches the affected topics. */
export class DataEvents {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(...topics: DataTopic[]): void {
    for (const listener of [...this.listeners]) listener(topics);
  }
}

export const dataEvents = new DataEvents();
