import crypto from 'node:crypto';

export const RACING_COLORS = ['green', 'black', 'white', 'silver', 'yellow', 'red', 'blue'];
export const RACER_ID_PREFIX = 'GUZ';
export const TOTAL_OFFICIAL_PUZZLES = 12;
export const MIN_COMPLETION_TIME_MS = 5000;
export const MAX_COMPLETION_TIME_MS = 8 * 60 * 1000;

export function createPrivateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashPrivateToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.get?.('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : '';
}

export function createPublicRacerId(randomInt = crypto.randomInt) {
  return `${RACER_ID_PREFIX}-${String(randomInt(0, 1000000)).padStart(6, '0')}`;
}

export function selectRacingColor(seed = crypto.randomInt(0, Number.MAX_SAFE_INTEGER)) {
  return RACING_COLORS[Math.abs(seed) % RACING_COLORS.length];
}

export function validatePuzzleOutcomes(outcomes, expectedTotal = TOTAL_OFFICIAL_PUZZLES) {
  if (!Array.isArray(outcomes)) {
    return { valid: false, errors: ['outcomes must be an array'] };
  }

  const errors = [];
  if (outcomes.length !== expectedTotal) {
    errors.push(`outcomes must contain ${expectedTotal} puzzle results`);
  }

  const normalized = outcomes.map((outcome) => String(outcome).toLowerCase());
  const invalid = normalized.filter((outcome) => !['correct', 'missed'].includes(outcome));
  if (invalid.length > 0) {
    errors.push('outcomes may only contain correct or missed');
  }

  return {
    valid: errors.length === 0,
    errors,
    correctAnswers: normalized.filter((outcome) => outcome === 'correct').length,
    timeouts: normalized.filter((outcome) => outcome === 'missed').length,
    totalPuzzles: expectedTotal,
  };
}

export function validateCompletionTime(completionTimeMs) {
  const elapsed = Number(completionTimeMs);
  if (!Number.isFinite(elapsed)) {
    return { valid: false, error: 'completion time is invalid' };
  }

  if (elapsed < MIN_COMPLETION_TIME_MS) {
    return { valid: false, error: 'completion time is too fast' };
  }

  if (elapsed > MAX_COMPLETION_TIME_MS) {
    return { valid: false, error: 'completion time is too slow' };
  }

  return { valid: true, elapsedMilliseconds: Math.round(elapsed) };
}

export function calculateAccuracy(correctAnswers, totalPuzzles) {
  return Math.round((Number(correctAnswers) / Number(totalPuzzles)) * 100);
}
