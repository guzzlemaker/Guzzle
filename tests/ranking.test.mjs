import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLeaderboardRuns, validateRunPayload } from '../src/lib/ranking.js';

test('ranks by solves, mistakes, timeouts, elapsed time, then submission time', () => {
  const ranked = rankLeaderboardRuns([
    { id: 'slow-perfect', correctAnswers: 12, incorrectAnswers: 0, timeouts: 0, elapsedMilliseconds: 200000, completedAt: '2026-07-30T12:01:00Z' },
    { id: 'fast-eleven', correctAnswers: 11, incorrectAnswers: 0, timeouts: 1, elapsedMilliseconds: 90000, completedAt: '2026-07-30T12:00:00Z' },
    { id: 'fast-perfect', correctAnswers: 12, incorrectAnswers: 0, timeouts: 0, elapsedMilliseconds: 180000, completedAt: '2026-07-30T12:02:00Z' },
    { id: 'more-wrong', correctAnswers: 12, incorrectAnswers: 1, timeouts: 0, elapsedMilliseconds: 100000, completedAt: '2026-07-30T12:03:00Z' },
  ]);

  assert.deepEqual(ranked.map((run) => run.id), ['fast-perfect', 'slow-perfect', 'more-wrong', 'fast-eleven']);
});

test('validates impossible result payloads', () => {
  const invalid = validateRunPayload({
    anonymousId: 'guest',
    officialDate: '2026-07-30',
    trackType: 'daily',
    trackId: 'track',
    elapsedMilliseconds: 100,
    totalPuzzles: 12,
    correctAnswers: 13,
    incorrectAnswers: 0,
    timeouts: 0,
  });

  assert.equal(invalid.valid, false);
});

test('accepts valid daily run payload', () => {
  const valid = validateRunPayload({
    anonymousId: 'guest',
    officialDate: '2026-07-30',
    trackType: 'daily',
    trackId: 'track',
    elapsedMilliseconds: 190000,
    totalPuzzles: 12,
    correctAnswers: 10,
    incorrectAnswers: 0,
    timeouts: 2,
  });

  assert.equal(valid.valid, true);
});
