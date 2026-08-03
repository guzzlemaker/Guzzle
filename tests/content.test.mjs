import test from 'node:test';
import assert from 'node:assert/strict';
import { getTracksForOfficialDate } from '../api/_lib/content.js';

test('server tracks do not use tomorrow daily as today bonus', () => {
  const augustSecond = getTracksForOfficialDate('2026-08-02');
  const augustThird = getTracksForOfficialDate('2026-08-03');

  assert.equal(augustSecond.daily.theme, 'GUILTY PLEASURES');
  assert.equal(augustThird.daily.theme, 'BUCKET LIST');
  assert.notEqual(augustSecond.bonus.theme, augustThird.daily.theme);
});
