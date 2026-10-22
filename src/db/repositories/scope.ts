import type { StatsScope } from '../../domain/stats';

/**
 * SQL condition restricting a `sessions` row to a Stats scope. A session belongs to a habit when it
 * is linked to a habit occurrence; everything else (tasks, free sessions) is "other".
 */
export function scopeClause(scope: StatsScope, alias = 's'): string {
  if (scope === 'habits') return `${alias}.habit_occurrence_id IS NOT NULL`;
  if (scope === 'other') return `${alias}.habit_occurrence_id IS NULL`;
  return '1 = 1';
}
