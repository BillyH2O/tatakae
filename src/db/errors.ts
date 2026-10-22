export class DuplicateNameError extends Error {
  constructor(name: string) {
    super(`A record named "${name}" already exists`);
    this.name = 'DuplicateNameError';
  }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}
