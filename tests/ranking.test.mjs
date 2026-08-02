import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyLeaderboard } from '../api/_lib/leaderboard.js';
import { rankLeaderboardRuns, validateRunPayload } from '../src/lib/ranking.js';

test('ranks by solves, elapsed time, then submission time', () => {
  const ranked = rankLeaderboardRuns([
    { id: 'slow-perfect', correctAnswers: 12, incorrectAnswers: 0, timeouts: 0, elapsedMilliseconds: 200000, completedAt: '2026-07-30T12:01:00Z' },
    { id: 'fast-eleven', correctAnswers: 11, incorrectAnswers: 0, timeouts: 1, elapsedMilliseconds: 90000, completedAt: '2026-07-30T12:00:00Z' },
    { id: 'fast-perfect', correctAnswers: 12, incorrectAnswers: 0, timeouts: 0, elapsedMilliseconds: 180000, completedAt: '2026-07-30T12:02:00Z' },
    { id: 'more-wrong', correctAnswers: 12, incorrectAnswers: 1, timeouts: 0, elapsedMilliseconds: 100000, completedAt: '2026-07-30T12:03:00Z' },
  ]);

  assert.deepEqual(ranked.map((run) => run.id), ['more-wrong', 'fast-perfect', 'slow-perfect', 'fast-eleven']);
});

test('ranks same score by fastest time', () => {
  const ranked = rankLeaderboardRuns([
    { id: 'slow', correctAnswers: 11, elapsedMilliseconds: 170000, completedAt: '2026-07-30T12:00:00Z' },
    { id: 'fast', correctAnswers: 11, elapsedMilliseconds: 120000, completedAt: '2026-07-30T12:01:00Z' },
  ]);

  assert.deepEqual(ranked.map((run) => run.id), ['fast', 'slow']);
});

test('ranks same score and time by earlier submission', () => {
  const ranked = rankLeaderboardRuns([
    { id: 'later', correctAnswers: 11, elapsedMilliseconds: 120000, completedAt: '2026-07-30T12:01:00Z' },
    { id: 'earlier', correctAnswers: 11, elapsedMilliseconds: 120000, completedAt: '2026-07-30T12:00:00Z' },
  ]);

  assert.deepEqual(ranked.map((run) => run.id), ['earlier', 'later']);
});

test('daily leaderboard returns #1 of 1 for one player', () => {
  const leaderboard = buildDailyLeaderboard([
    {
      id: 'one',
      playerId: 'player-one',
      publicRacerId: 'GUZ-000001',
      correctAnswers: 11,
      totalPuzzles: 12,
      completionTimeMs: 170000,
      submittedAt: '2026-07-30T12:00:00Z',
    },
  ], 'GUZ-000001');

  assert.equal(leaderboard.dailyResult.rank, 1);
  assert.equal(leaderboard.dailyResult.totalPlayers, 1);
  assert.equal(leaderboard.playerEntry.rank <= leaderboard.totalEntries, true);
});

test('daily leaderboard ranks two players by score', () => {
  const leaderboard = buildDailyLeaderboard([
    { id: 'best', playerId: 'a', publicRacerId: 'GUZ-000001', correctAnswers: 12, totalPuzzles: 12, completionTimeMs: 200000, submittedAt: '2026-07-30T12:01:00Z' },
    { id: 'lower', playerId: 'b', publicRacerId: 'GUZ-000002', correctAnswers: 11, totalPuzzles: 12, completionTimeMs: 100000, submittedAt: '2026-07-30T12:00:00Z' },
  ], 'GUZ-000002');

  assert.equal(leaderboard.entries[0].publicRacerId, 'GUZ-000001');
  assert.equal(leaderboard.playerEntry.rank, 2);
  assert.equal(leaderboard.dailyResult.totalPlayers, 2);
});

test('daily leaderboard keeps only a player best valid attempt', () => {
  const leaderboard = buildDailyLeaderboard([
    { id: 'old-slow', playerId: 'a', publicRacerId: 'GUZ-000001', correctAnswers: 10, totalPuzzles: 12, completionTimeMs: 250000, submittedAt: '2026-07-30T12:00:00Z' },
    { id: 'best', playerId: 'a', publicRacerId: 'GUZ-000001', correctAnswers: 11, totalPuzzles: 12, completionTimeMs: 170000, submittedAt: '2026-07-30T12:02:00Z' },
    { id: 'other', playerId: 'b', publicRacerId: 'GUZ-000002', correctAnswers: 10, totalPuzzles: 12, completionTimeMs: 100000, submittedAt: '2026-07-30T12:01:00Z' },
  ], 'GUZ-000001');

  assert.equal(leaderboard.totalEntries, 2);
  assert.equal(leaderboard.playerEntry.rank, 1);
  assert.equal(leaderboard.playerEntry.correctAnswers, 11);
});

test('daily leaderboard includes non-perfect finished scores without impossible rank totals', () => {
  const leaderboard = buildDailyLeaderboard([
    { id: 'eleven', playerId: 'a', publicRacerId: 'GUZ-000001', correctAnswers: 11, totalPuzzles: 12, completionTimeMs: 170000, submittedAt: '2026-07-30T12:00:00Z', completed: false },
  ], 'GUZ-000001');

  assert.equal(leaderboard.dailyResult.rank, 1);
  assert.equal(leaderboard.dailyResult.totalPlayers, 1);
  assert.equal(leaderboard.dailyResult.rank <= leaderboard.dailyResult.totalPlayers, true);
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
