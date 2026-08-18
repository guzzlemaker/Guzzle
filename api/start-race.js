import { getOfficialDate, getTracksForOfficialDate } from './_lib/content.js';
import { jsonResponse, readJson, sanitizeDisplayName } from './_lib/http.js';
import { getBearerToken, hashPrivateToken } from './_lib/race-security.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';
import { createPrivateToken } from './_lib/race-security.js';

const SCORING_VERSION = 'checkpoint1-v1';
const CONTENT_VERSION = 1;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 202, {
      configured: false,
      message: 'Official race sessions need the Supabase backend to be configured.',
    });
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse(response, 401, { error: 'RACER_AUTH_REQUIRED' });
  }

  const payload = await readJson(request);
  const trackType = payload?.trackType === 'bonus' ? 'bonus' : 'daily';
  const officialDate = getOfficialDate();
  const tracks = getTracksForOfficialDate(officialDate);
  const track = trackType === 'bonus' ? tracks.bonus : tracks.daily;

  if (!track) {
    return jsonResponse(response, 404, { error: 'TRACK_NOT_READY' });
  }

  try {
    const player = await findPlayer(token);
    if (!player) {
      return jsonResponse(response, 401, { error: 'INVALID_RACER_TOKEN' });
    }

    const displayName = sanitizeDisplayName(payload?.displayName);
    if (displayName) {
      await supabaseRequest(`players?id=eq.${player.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: displayName,
          last_seen_at: new Date().toISOString(),
        }),
      });
    }

    const dailyRace = await upsertDailyRace({
      officialDate,
      trackType,
      trackId: track.id,
      contentVersion: track.version ?? CONTENT_VERSION,
    });

    const previousResult = await supabaseRequest(
      `race_results?player_id=eq.${player.id}&daily_race_id=eq.${dailyRace.id}&select=id`,
    );
    const submissionToken = createPrivateToken();
    const sessions = await supabaseRequest('race_sessions', {
      method: 'POST',
      body: JSON.stringify({
        player_id: player.id,
        daily_race_id: dailyRace.id,
        submission_token_hash: hashPrivateToken(submissionToken),
        client_started_at: payload?.clientStartedAt ? new Date(payload.clientStartedAt).toISOString() : null,
        user_agent_seen: Boolean(request.headers.get?.('user-agent') || request.headers['user-agent']),
      }),
    });

    return jsonResponse(response, 201, {
      configured: true,
      sessionId: sessions[0].id,
      submissionToken,
      officialDate,
      trackType,
      trackId: track.id,
      publicRacerId: player.public_racer_id,
      displayName: displayName || player.display_name || null,
      alreadySubmitted: previousResult.length > 0,
      scoringVersion: SCORING_VERSION,
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'RACE_SESSION_FAILED',
      message: 'Official race session could not be started. Local play can continue.',
    });
  }
}

export async function findPlayer(token) {
  const players = await supabaseRequest(
    `players?private_token_hash=eq.${encodeURIComponent(hashPrivateToken(token))}&select=id,public_racer_id,display_name,racing_color`,
  );

  return players?.[0] ?? null;
}

export async function upsertDailyRace({ officialDate, trackType, trackId, contentVersion = CONTENT_VERSION }) {
  const races = await supabaseRequest('daily_races?on_conflict=race_date,track_type', {
    method: 'POST',
    prefer: 'return=representation,resolution=merge-duplicates',
    body: JSON.stringify({
      race_date: officialDate,
      track_type: trackType,
      track_id: trackId,
      timezone: process.env.GUZZLE_TIMEZONE || 'America/Denver',
      content_version: contentVersion,
      scoring_version: SCORING_VERSION,
    }),
  });

  return races[0];
}
