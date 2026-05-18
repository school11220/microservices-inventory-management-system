export function toUtcDateBucket(input: string | Date): Date {
  const date = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function defaultFromDate(now = new Date()): Date {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 30);
  return toUtcDateBucket(from);
}
