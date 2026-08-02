import { getOfficialDate } from './_lib/content.js';
import { jsonResponse } from './_lib/http.js';
import { loadOfficialLeaderboard } from './_lib/leaderboard.js';
import { isDatabaseConfigured } from './_lib/supabase-rest.js';

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
    const leaderboard = await loadOfficialLeaderboard({ officialDate, trackType, publicRacerId });

    return jsonResponse(response, 200, {
      configured: true,
      officialDate,
      trackType,
      entries: leaderboard.entries,
      playerEntry: leaderboard.playerEntry,
      totalEntries: leaderboard.totalEntries,
      dailyResult: leaderboard.dailyResult,
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'LEADERBOARD_UNAVAILABLE',
      message: 'Leaderboard is unavailable. Try again shortly.',
    });
  }
}
