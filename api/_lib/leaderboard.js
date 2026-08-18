import { supabaseRequest } from './supabase-rest.js';

export function compareOfficialResults(left, right) {
  const leftScore = Number(left.correctAnswers ?? left.correct_answers ?? 0);
  const rightScore = Number(right.correctAnswers ?? right.correct_answers ?? 0);
  if (leftScore !== rightScore) return rightScore - leftScore;

  const leftTime = Number(left.completionTimeMs ?? left.completion_time_ms ?? Number.MAX_SAFE_INTEGER);
  const rightTime = Number(right.completionTimeMs ?? right.completion_time_ms ?? Number.MAX_SAFE_INTEGER);
  if (leftTime !== rightTime) return leftTime - rightTime;

  const leftSubmittedAt = new Date(left.submittedAt ?? left.submitted_at ?? left.completedAt ?? left.completed_at ?? 0).getTime();
  const rightSubmittedAt = new Date(right.submittedAt ?? right.submitted_at ?? right.completedAt ?? right.completed_at ?? 0).getTime();
  return leftSubmittedAt - rightSubmittedAt;
}

export function buildDailyLeaderboard(results, publicRacerId) {
  const bestByPlayer = new Map();

  for (const result of results ?? []) {
    const playerKey = result.playerId ?? result.player_id ?? result.publicRacerId ?? result.public_racer_id;
    if (!playerKey) continue;

    const currentBest = bestByPlayer.get(playerKey);
    if (!currentBest || compareOfficialResults(result, currentBest) < 0) {
      bestByPlayer.set(playerKey, result);
    }
  }

  const rankedEntries = [...bestByPlayer.values()]
    .sort(compareOfficialResults)
    .map((result, index) => formatLeaderboardEntry(result, index + 1));
  const totalPlayers = rankedEntries.length;
  const playerEntry = publicRacerId
    ? rankedEntries.find((entry) => entry.publicRacerId === publicRacerId) ?? null
    : null;

  return {
    entries: rankedEntries.slice(0, 10),
    playerEntry: playerEntry ? { ...playerEntry, isCurrentPlayer: true } : null,
    totalEntries: totalPlayers,
    dailyResult: playerEntry
      ? {
          rank: playerEntry.rank,
          totalPlayers,
          score: playerEntry.correctAnswers,
          completionTimeMs: playerEntry.completionTimeMs,
        }
      : null,
  };
}

export async function loadOfficialLeaderboard({ officialDate, trackType = 'daily', publicRacerId, dailyRaceId }) {
  const race = dailyRaceId
    ? await loadDailyRaceById(dailyRaceId)
    : await loadDailyRaceByDate({ officialDate, trackType });

  if (!race) {
    return {
      entries: [],
      playerEntry: null,
      totalEntries: 0,
      dailyResult: null,
    };
  }

  const results = await supabaseRequest(
    `race_results?daily_race_id=eq.${race.id}&select=id,player_id,correct_answers,total_puzzles,accuracy_percentage,completion_time_ms,timeouts,incorrect_answers,submitted_at,completed_at,completed,players(public_racer_id,display_name,racing_color)`,
  );

  return buildDailyLeaderboard(
    results.map((result) => ({
      id: result.id,
      playerId: result.player_id,
      publicRacerId: result.players?.public_racer_id,
      displayName: result.players?.display_name,
      racingColor: result.players?.racing_color,
      correctAnswers: result.correct_answers,
      totalPuzzles: result.total_puzzles,
      accuracyPercentage: result.accuracy_percentage,
      completionTimeMs: result.completion_time_ms,
      timeouts: result.timeouts,
      incorrectAnswers: result.incorrect_answers,
      submittedAt: result.submitted_at,
      completedAt: result.completed_at,
    })),
    publicRacerId,
  );
}

async function loadDailyRaceById(dailyRaceId) {
  const races = await supabaseRequest(
    `daily_races?id=eq.${encodeURIComponent(dailyRaceId)}&select=id,race_date,track_type`,
  );
  return races?.[0] ?? null;
}

async function loadDailyRaceByDate({ officialDate, trackType }) {
  const races = await supabaseRequest(
    `daily_races?race_date=eq.${encodeURIComponent(officialDate)}&track_type=eq.${encodeURIComponent(trackType)}&select=id,race_date,track_type`,
  );
  return races?.[0] ?? null;
}

function formatLeaderboardEntry(result, rank) {
  return {
    id: result.id,
    rank,
    publicRacerId: result.publicRacerId ?? result.public_racer_id,
    displayName: result.displayName ?? result.display_name ?? null,
    racingColor: result.racingColor ?? result.racing_color ?? null,
    correctAnswers: Number(result.correctAnswers ?? result.correct_answers ?? 0),
    totalPuzzles: Number(result.totalPuzzles ?? result.total_puzzles ?? 0),
    accuracyPercentage: Number(result.accuracyPercentage ?? result.accuracy_percentage ?? 0),
    completionTimeMs: Number(result.completionTimeMs ?? result.completion_time_ms ?? 0),
    timeouts: Number(result.timeouts ?? 0),
    incorrectAnswers: Number(result.incorrectAnswers ?? result.incorrect_answers ?? 0),
    submittedAt: result.submittedAt ?? result.submitted_at ?? null,
    isCurrentPlayer: false,
  };
}
