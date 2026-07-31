import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAnalyticsDetails } from '../src/lib/analytics.js';

test('analytics sanitizer removes sensitive values', () => {
  const sanitized = sanitizeAnalyticsDetails({
    answer: 'SECRET PHRASE',
    guess: 'SECRET',
    email: 'person@example.com',
    officialDate: '2026-07-30',
    elapsedMilliseconds: 190000,
  });

  assert.equal(sanitized.answer, undefined);
  assert.equal(sanitized.guess, undefined);
  assert.equal(sanitized.email, undefined);
  assert.equal(sanitized.officialDate, '2026-07-30');
  assert.equal(sanitized.elapsedTimeBucket, '3m_to_4m');
});
