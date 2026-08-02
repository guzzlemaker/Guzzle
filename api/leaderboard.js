import { getOfficialDate } from './_lib/content.js';
import { jsonResponse } from './_lib/http.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';
import { formatLeaderboard } from './complete-race.js';

export default async function handler(request, response) {
  const url = new URL(request.url, 'https://playguzzle.com');
  const officialDate = url.searchParams.get('officialDate') || getOfficialDate();
  const trackType = url.searchParams.get('trackType') || 'daily';
  const publicRacerId = url.searchParams.get('publicRacerId');

  if (!isDatabaseConfigured()) {
    return jsonResponse(response, 200, {
      configured: false,
      officialDate,
      trackType,
      entries: [],
      playerEntry: null,
      totalEntries: 0,
      message: 'Leaderboard backend is not configured yet.',
    });
  }

  try {
    const rows = await supabaseRequest('rpc/get_daily_leaderboard', {
      method: 'POST',
      body: JSON.stringify({
        p_race_date: officialDate,
        p_track_type: trackType,
        p_public_racer_id: publicRacerId,
      }),
    });
    const leaderboard = formatLeaderboard(rows, publicRacerId);

    return jsonResponse(response, 200, {
      configured: true,
      officialDate,
      trackType,
      entries: leaderboard.entries,
      playerEntry: leaderboard.playerEntry,
      totalEntries: leaderboard.totalEntries,
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'LEADERBOARD_UNAVAILABLE',
      message: 'Leaderboard is unavailable. Try again shortly.',
    });
  }
}
