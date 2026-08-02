import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAccuracy,
  createPublicRacerId,
  hashPrivateToken,
  validateCompletionTime,
  validatePuzzleOutcomes,
} from '../api/_lib/race-security.js';

test('generates formatted public Race Car IDs', () => {
  assert.equal(createPublicRacerId(() => 482917), 'GUZ-482917');
  assert.equal(createPublicRacerId(() => 7), 'GUZ-000007');
});

test('hashes private racer tokens deterministically without exposing the token', () => {
  const hash = hashPrivateToken('secret-token');
  assert.equal(hash, hashPrivateToken('secret-token'));
  assert.notEqual(hash, 'secret-token');
  assert.equal(hash.length, 64);
});

test('validates official puzzle outcomes and counts score fields', () => {
  const validation = validatePuzzleOutcomes(['correct', 'missed', 'correct'], 3);
  assert.equal(validation.valid, true);
  assert.equal(validation.correctAnswers, 2);
  assert.equal(validation.timeouts, 1);
  assert.equal(validation.totalPuzzles, 3);
});

test('rejects manipulated puzzle outcomes', () => {
  assert.equal(validatePuzzleOutcomes(['correct'], 12).valid, false);
  assert.equal(validatePuzzleOutcomes(['correct', 'skipped'], 2).valid, false);
});

test('validates reasonable official completion times', () => {
  assert.equal(validateCompletionTime(120000).valid, true);
  assert.equal(validateCompletionTime(100).valid, false);
  assert.equal(validateCompletionTime(900000).valid, false);
});

test('calculates accuracy percentage', () => {
  assert.equal(calculateAccuracy(11, 12), 92);
  assert.equal(calculateAccuracy(12, 12), 100);
  assert.equal(calculateAccuracy(0, 12), 0);
});
