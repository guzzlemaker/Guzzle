import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMsUntilNextOfficialDay,
  getOfficialDateKey,
  selectDailyAndBonusTrack,
} from '../src/lib/daily.js';

const sets = [
  { dateSeed: '2026-03-07', gameNumber: 1, theme: 'YESTERDAY', puzzles: [] },
  { dateSeed: '2026-03-08', gameNumber: 2, theme: 'TODAY', puzzles: [] },
  { dateSeed: '2026-03-09', gameNumber: 3, theme: 'TOMORROW', puzzles: [] },
];

test('calculates official America/Denver date before and after midnight', () => {
  assert.equal(getOfficialDateKey(new Date('2026-07-30T05:59:00.000Z'), 'America/Denver'), '2026-07-29');
  assert.equal(getOfficialDateKey(new Date('2026-07-30T06:01:00.000Z'), 'America/Denver'), '2026-07-30');
});

test('handles daylight saving spring transition', () => {
  assert.equal(getOfficialDateKey(new Date('2026-03-08T08:30:00.000Z'), 'America/Denver'), '2026-03-08');
  assert.ok(getMsUntilNextOfficialDay(new Date('2026-03-08T08:30:00.000Z'), 'America/Denver') > 0);
});

test('selects daily and bonus tracks by official date', () => {
  const selected = selectDailyAndBonusTrack(sets, '2026-03-08');
  assert.equal(selected.daily.trackType, 'daily');
  assert.equal(selected.daily.theme, 'TODAY');
  assert.equal(selected.bonus.trackType, 'bonus');
  assert.equal(selected.bonus.theme, 'TOMORROW');
});

test('returns missing daily content without reusing yesterday', () => {
  const selected = selectDailyAndBonusTrack(sets, '2026-03-10');
  assert.equal(selected.daily, null);
  assert.equal(selected.bonus, null);
});
