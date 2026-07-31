export function compareLeaderboardRuns(left, right) {
  const leftCorrect = Number(left.correctAnswers ?? left.correctCount ?? 0);
  const rightCorrect = Number(right.correctAnswers ?? right.correctCount ?? 0);
  if (leftCorrect !== rightCorrect) return rightCorrect - leftCorrect;

  const leftIncorrect = Number(left.incorrectAnswers ?? 0);
  const rightIncorrect = Number(right.incorrectAnswers ?? 0);
  if (leftIncorrect !== rightIncorrect) return leftIncorrect - rightIncorrect;

  const leftTimeouts = Number(left.timeouts ?? left.missedCount ?? 0);
  const rightTimeouts = Number(right.timeouts ?? right.missedCount ?? 0);
  if (leftTimeouts !== rightTimeouts) return leftTimeouts - rightTimeouts;

  const leftElapsed = Number(left.elapsedMilliseconds ?? left.resultMs ?? Number.MAX_SAFE_INTEGER);
  const rightElapsed = Number(right.elapsedMilliseconds ?? right.resultMs ?? Number.MAX_SAFE_INTEGER);
  if (leftElapsed !== rightElapsed) return leftElapsed - rightElapsed;

  return new Date(left.completedAt ?? 0).getTime() - new Date(right.completedAt ?? 0).getTime();
}

export function rankLeaderboardRuns(runs) {
  const sortedRuns = [...runs].sort(compareLeaderboardRuns);
  return sortedRuns.map((run, index) => ({
    ...run,
    rank: index + 1,
  }));
}

export function getElapsedBucket(elapsedMilliseconds) {
  const seconds = Math.max(0, Math.floor(Number(elapsedMilliseconds || 0) / 1000));
  if (seconds < 120) return 'under_2m';
  if (seconds < 180) return '2m_to_3m';
  if (seconds < 240) return '3m_to_4m';
  if (seconds < 300) return '4m_to_5m';
  return '5m_plus';
}

export function validateRunPayload(payload, expectedTotalPuzzles = 12) {
  const errors = [];
  const elapsedMilliseconds = Number(payload?.elapsedMilliseconds);
  const totalPuzzles = Number(payload?.totalPuzzles);
  const correctAnswers = Number(payload?.correctAnswers);
  const incorrectAnswers = Number(payload?.incorrectAnswers ?? 0);
  const timeouts = Number(payload?.timeouts ?? 0);

  if (!payload?.anonymousId || typeof payload.anonymousId !== 'string') errors.push('anonymousId is required');
  if (!payload?.officialDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.officialDate)) errors.push('officialDate is invalid');
  if (!['daily', 'bonus'].includes(payload?.trackType)) errors.push('trackType is invalid');
  if (!payload?.trackId || typeof payload.trackId !== 'string') errors.push('trackId is required');
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds <= 0) errors.push('elapsedMilliseconds is invalid');
  if (elapsedMilliseconds < 5000) errors.push('elapsedMilliseconds is too fast');
  if (elapsedMilliseconds > 30 * 1000 * expectedTotalPuzzles + 60 * 1000) errors.push('elapsedMilliseconds is too slow');
  if (totalPuzzles !== expectedTotalPuzzles) errors.push('totalPuzzles is invalid');
  if (!Number.isInteger(correctAnswers) || correctAnswers < 0 || correctAnswers > expectedTotalPuzzles) {
    errors.push('correctAnswers is invalid');
  }
  if (!Number.isInteger(incorrectAnswers) || incorrectAnswers < 0 || incorrectAnswers > expectedTotalPuzzles) {
    errors.push('incorrectAnswers is invalid');
  }
  if (!Number.isInteger(timeouts) || timeouts < 0 || timeouts > expectedTotalPuzzles) {
    errors.push('timeouts is invalid');
  }
  if (correctAnswers + timeouts > expectedTotalPuzzles) errors.push('puzzle totals are invalid');

  return {
    valid: errors.length === 0,
    errors,
  };
}
