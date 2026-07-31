import { getOfficialDate, getTracksForOfficialDate } from './_lib/content.js';
import { jsonResponse, readJson, sanitizeDisplayName } from './_lib/http.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';
import { validateRunPayload } from '../src/lib/ranking.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const payload = await readJson(request);
  const validation = validateRunPayload(payload);

  if (!validation.valid) {
    return jsonResponse(response, 400, { error: 'INVALID_RESULT', messages: validation.errors });
  }

  const officialToday = getOfficialDate();
  if (payload.officialDate > officialToday) {
    return jsonResponse(response, 400, { error: 'FUTURE_RUN_REJECTED' });
  }

  const tracks = getTracksForOfficialDate(payload.officialDate);
  const track = payload.trackType === 'bonus' ? tracks.bonus : tracks.daily;

  if (!track || track.id !== payload.trackId) {
    return jsonResponse(response, 400, { error: 'TRACK_MISMATCH' });
  }

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 202, {
      accepted: false,
      configured: false,
      message: 'Result validated locally. Leaderboard backend is not configured yet.',
    });
  }

  try {
    const displayName = sanitizeDisplayName(payload.displayName);
    const player = await upsertPlayer(payload.anonymousId, displayName);
    const runBody = {
      player_id: player.id,
      anonymous_id: payload.anonymousId,
      display_name: displayName,
      official_date: payload.officialDate,
      track_type: payload.trackType,
      track_id: payload.trackId,
      started_at: payload.startedAt ? new Date(payload.startedAt).toISOString() : null,
      completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : new Date().toISOString(),
      elapsed_milliseconds: Math.round(Number(payload.elapsedMilliseconds)),
      total_puzzles: Number(payload.totalPuzzles),
      correct_answers: Number(payload.correctAnswers),
      incorrect_answers: Number(payload.incorrectAnswers ?? 0),
      timeouts: Number(payload.timeouts ?? 0),
      final_score: Number(payload.correctAnswers),
      result_status: 'completed',
      client_version: payload.clientVersion ?? null,
      integrity_metadata: {
        userAgentHash: request.headers.get('user-agent') ? 'present' : 'missing',
        submittedAt: new Date().toISOString(),
      },
    };

    const runs = await supabaseRequest('daily_runs', {
      method: 'POST',
      body: JSON.stringify(runBody),
      prefer:
        payload.trackType === 'daily'
          ? 'return=representation,resolution=ignore-duplicates'
          : 'return=representation',
    });

    if (!runs?.length) {
      return jsonResponse(response, 409, {
        error: 'DUPLICATE_DAILY_RESULT',
        message: 'Your first Daily GUZZLE result is already ranked. This run is practice.',
      });
    }

    return jsonResponse(response, 200, {
      accepted: true,
      configured: true,
      runId: runs[0].id,
    });
  } catch (error) {
    if (payload.trackType === 'daily' && (error.status === 409 || error.details?.code === '23505')) {
      return jsonResponse(response, 409, {
        error: 'DUPLICATE_DAILY_RESULT',
        message: 'Your first Daily GUZZLE result is already ranked. This run is practice.',
      });
    }

    return jsonResponse(response, 500, {
      error: 'RESULT_SUBMISSION_FAILED',
      message: 'Result could not be submitted. Your local result is still saved.',
    });
  }
}

async function upsertPlayer(anonymousId, displayName) {
  const existing = await supabaseRequest(`players?anonymous_id=eq.${encodeURIComponent(anonymousId)}&select=id`, {
    headers: { prefer: 'return=representation' },
  });

  if (existing?.[0]) {
    const updated = await supabaseRequest(`players?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: displayName,
        last_seen_at: new Date().toISOString(),
      }),
    });
    return updated[0] ?? existing[0];
  }

  const inserted = await supabaseRequest('players', {
    method: 'POST',
    body: JSON.stringify({
      anonymous_id: anonymousId,
      display_name: displayName,
      last_seen_at: new Date().toISOString(),
    }),
  });

  return inserted[0];
}
