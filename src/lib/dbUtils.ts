export function createDatabaseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (
      Number(c) ^
      (Math.random() * 16) >> (Number(c) / 4)
    ).toString(16)
  );
}

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function toDatabaseUuid(value: string | null | undefined): string | undefined {
  return isUuid(value) ? value : undefined;
}

export function logSupabaseError(action: string, error: unknown) {
  if (error) {
    console.error(`Supabase ${action} failed:`, error);
  }
}
