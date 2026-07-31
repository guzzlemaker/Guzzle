import { rankLeaderboardRuns } from '../src/lib/ranking.js';
import { getOfficialDate } from './_lib/content.js';
import { jsonResponse } from './_lib/http.js';
import { isDatabaseConfigured, supabaseRequest } from './_lib/supabase-rest.js';

export default async function handler(request, response) {
  const url = new URL(request.url, 'https://playguzzle.com');
  const officialDate = url.searchParams.get('officialDate') || getOfficialDate();
  const trackType = url.searchParams.get('trackType') || 'daily';
  const anonymousId = url.searchParams.get('anonymousId');

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
    const runs = await supabaseRequest(
      `daily_runs?official_date=eq.${officialDate}&track_type=eq.${trackType}&result_status=eq.completed&select=id,anonymous_id,display_name,elapsed_milliseconds,total_puzzles,correct_answers,incorrect_answers,timeouts,completed_at&order=correct_answers.desc,incorrect_answers.asc,timeouts.asc,elapsed_milliseconds.asc,completed_at.asc`,
      { headers: { prefer: 'return=representation' } },
    );
    const ranked = rankLeaderboardRuns(
      runs.map((run) => ({
        id: run.id,
        anonymousId: run.anonymous_id,
        displayName: run.display_name || 'Guest Racer',
        elapsedMilliseconds: run.elapsed_milliseconds,
        totalPuzzles: run.total_puzzles,
        correctAnswers: run.correct_answers,
        incorrectAnswers: run.incorrect_answers,
        timeouts: run.timeouts,
        completedAt: run.completed_at,
      })),
    );
    const playerEntry = anonymousId ? ranked.find((entry) => entry.anonymousId === anonymousId) ?? null : null;

    return jsonResponse(response, 200, {
      configured: true,
      officialDate,
      trackType,
      entries: ranked.slice(0, 25),
      playerEntry,
      totalEntries: ranked.length,
    });
  } catch {
    return jsonResponse(response, 500, {
      error: 'LEADERBOARD_UNAVAILABLE',
      message: 'Leaderboard is unavailable. Try again shortly.',
    });
  }
}
