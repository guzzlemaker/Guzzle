import { jsonResponse, readJson } from './_lib/http.js';
import {
  calculateAccuracy,
  getBearerToken,
  hashPrivateToken,
  TOTAL_OFFICIAL_PUZZLES,
  validateCompletionTime,
  validatePuzzleOutcomes,
} from './_lib/race-security.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';
import { findPlayer } from './start-race.js';
import { loadOfficialLeaderboard } from './_lib/leaderboard.js';

const SCORING_VERSION = 'checkpoint1-v1';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 202, {
      accepted: false,
      configured: false,
      message: 'Result validated locally. Official leaderboard backend is not configured yet.',
    });
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse(response, 401, { error: 'RACER_AUTH_REQUIRED' });
  }

  const payload = await readJson(request);
  const outcomeValidation = validatePuzzleOutcomes(payload?.outcomes, TOTAL_OFFICIAL_PUZZLES);
  if (!outcomeValidation.valid) {
    return jsonResponse(response, 400, { error: 'INVALID_OUTCOMES', messages: outcomeValidation.errors });
  }

  if (!payload?.sessionId || !payload?.submissionToken || !payload?.idempotencyKey) {
    return jsonResponse(response, 400, { error: 'MISSING_SESSION_DETAILS' });
  }

  try {
    const player = await findPlayer(token);
    if (!player) {
      return jsonResponse(response, 401, { error: 'INVALID_RACER_TOKEN' });
    }

    const session = await loadSession(payload.sessionId);
    if (!session || session.player_id !== player.id) {
      return jsonResponse(response, 403, { error: 'SESSION_DOES_NOT_BELONG_TO_RACER' });
    }

    if (session.submission_token_hash !== hashPrivateToken(payload.submissionToken)) {
      return jsonResponse(response, 403, { error: 'INVALID_SUBMISSION_TOKEN' });
    }

    const existingForSession = await getExistingResultForSession(session.id);
    if (existingForSession) {
      const leaderboard = await loadLeaderboard(session.daily_race_id, player.public_racer_id);
      return jsonResponse(response, 200, {
        accepted: true,
        configured: true,
        idempotent: true,
        result: formatResult(existingForSession, player.public_racer_id),
        leaderboard,
      });
    }

    const now = new Date();
    const serverStartedAt = new Date(session.server_started_at);
    const completionTime = validateCompletionTime(now.getTime() - serverStartedAt.getTime());
    if (!completionTime.valid) {
      await markSession(session.id, 'abandoned', now);
      return jsonResponse(response, 400, { error: 'INVALID_COMPLETION_TIME', message: completionTime.error });
    }

    const incorrectAnswers = Math.max(0, Math.min(TOTAL_OFFICIAL_PUZZLES, Number(payload?.incorrectAnswers ?? 0)));
    const resultBody = {
      player_id: player.id,
      daily_race_id: session.daily_race_id,
      race_session_id: session.id,
      correct_answers: outcomeValidation.correctAnswers,
      total_puzzles: outcomeValidation.totalPuzzles,
      accuracy_percentage: calculateAccuracy(outcomeValidation.correctAnswers, outcomeValidation.totalPuzzles),
      completion_time_ms: completionTime.elapsedMilliseconds,
      timeouts: outcomeValidation.timeouts,
      incorrect_answers: incorrectAnswers,
      completed: outcomeValidation.correctAnswers === outcomeValidation.totalPuzzles,
      started_at: session.server_started_at,
      completed_at: now.toISOString(),
      submitted_at: now.toISOString(),
      scoring_version: SCORING_VERSION,
      idempotency_key: String(payload.idempotencyKey).slice(0, 120),
      validation_metadata: {
        validation: 'checkpoint1-practical',
        clientElapsedMilliseconds: Number(payload?.clientElapsedMilliseconds ?? 0) || null,
        answersValidatedServerSide: false,
      },
    };

    const inserted = await supabaseRequest('race_results', {
      method: 'POST',
      body: JSON.stringify(resultBody),
    });

    await markSession(session.id, 'completed', now);
    const leaderboard = await loadLeaderboard(session.daily_race_id, player.public_racer_id);

    return jsonResponse(response, 200, {
      accepted: true,
      configured: true,
      idempotent: false,
      result: formatResult(inserted[0], player.public_racer_id),
      leaderboard,
    });
  } catch (error) {
    if (error.status === 409 || error.details?.code === '23505') {
      return jsonResponse(response, 409, {
        error: 'DAILY_RESULT_ALREADY_SUBMITTED',
        message: 'Your first official Daily GUZZLE result is already ranked. This run stays practice.',
      });
    }

    return jsonResponse(response, 500, {
      error: 'OFFICIAL_RESULT_FAILED',
      message: 'Official result could not be submitted. Your local result is still saved.',
    });
  }
}

async function loadSession(sessionId) {
  const sessions = await supabaseRequest(
    `race_sessions?id=eq.${encodeURIComponent(sessionId)}&select=id,player_id,daily_race_id,server_started_at,status,submission_token_hash`,
  );

  return sessions?.[0] ?? null;
}

async function getExistingResultForSession(sessionId) {
  const results = await supabaseRequest(
    `race_results?race_session_id=eq.${encodeURIComponent(sessionId)}&select=*`,
  );

  return results?.[0] ?? null;
}

async function markSession(sessionId, status, completedAt) {
  await supabaseRequest(`race_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      completed_at: completedAt.toISOString(),
    }),
  });
}

async function loadLeaderboard(dailyRaceId, publicRacerId) {
  return loadOfficialLeaderboard({ dailyRaceId, publicRacerId });
}

function formatResult(result, publicRacerId) {
  return {
    id: result.id,
    publicRacerId,
    correctAnswers: result.correct_answers,
    totalPuzzles: result.total_puzzles,
    accuracyPercentage: result.accuracy_percentage,
    completionTimeMs: result.completion_time_ms,
    timeouts: result.timeouts,
    incorrectAnswers: result.incorrect_answers,
    completed: result.completed,
    submittedAt: result.submitted_at,
  };
}
