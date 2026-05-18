import { toUtcDateBucket } from './reporting.utils';

describe('toUtcDateBucket', () => {
  it('normalizes dates to UTC midnight buckets', () => {
    expect(toUtcDateBucket('2026-05-15T18:30:00.000Z').toISOString()).toBe(
      '2026-05-15T00:00:00.000Z',
    );
  });
});
